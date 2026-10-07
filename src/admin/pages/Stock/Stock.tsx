import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, RefreshCw, Package, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { Box, InputAdornment, MenuItem, Pagination, TextField } from '@mui/material';
import { fetchAdminProducts } from '../../../services/productService';
import { getProductStockFromVariants } from '../../../utils/productVariants';
import { cleanText, normalizeCategory } from '../../../utils/formatters';
import { filterSelectSlotProps } from '../../../utils/labels';
import { ADMIN_PAGE_SIZE, getTotalPages } from '../../../utils/serverPagination';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import { StockBadge, StatusBadge } from '../../components/ProductTable/ProductBadges';
import './Stock.css';

const LOW_STOCK_THRESHOLD = 5;
const SEARCH_DEBOUNCE_MS = 300;

type StockLevel = 'ok' | 'low' | 'out';
type SortKey = 'name' | 'category' | 'stock';
interface SortConfig { key: SortKey; direction: 'asc' | 'desc' }

interface StockRow {
    id: string;
    name: string;
    category: string;
    imageUrl: string;
    stock: number;
    status: 'active' | 'inactive';
}

const getStockLevel = (stock: number): StockLevel => {
    if (stock <= 0) return 'out';
    return stock <= LOW_STOCK_THRESHOLD ? 'low' : 'ok';
};

// Si el producto trackea stock por talle, la suma de variantes es la fuente de verdad
// (igual que la tienda y el listado de Productos); la columna `stock` es solo fallback.
const mapStockRow = (p: Record<string, unknown>): StockRow => ({
    id: String(p.id),
    name: cleanText(p.name as string),
    category: normalizeCategory(p.category as string),
    imageUrl: (p.image_url as string) || '',
    stock: getProductStockFromVariants(p.variants as Parameters<typeof getProductStockFromVariants>[0]) ?? (p.stock as number),
    status: (p.status as StockRow['status']) || 'active',
});

const compareRows = (a: StockRow, b: StockRow, { key, direction }: SortConfig): number => {
    const result = key === 'stock' ? a.stock - b.stock : a[key].localeCompare(b[key], 'es');
    return direction === 'asc' ? result : -result;
};

const Stock = () => {
    const [rows, setRows] = useState<StockRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'stock', direction: 'asc' });
    const [pageState, setPageState] = useState({ key: '', page: 1 });

    const searchTerm = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS).trim().toLowerCase();
    const hasActiveFilters = Boolean(searchTerm || filterCategory || filterLevel || filterStatus);

    const loadStock = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const data = await fetchAdminProducts({ force: true });
            setRows(data.map((p: Record<string, unknown>) => mapStockRow(p)));
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStock();
    }, [loadStock]);

    const categories = useMemo(
        () => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
        [rows],
    );

    const counts = useMemo(() => ({
        total: rows.length,
        ok: rows.filter((r) => getStockLevel(r.stock) === 'ok').length,
        low: rows.filter((r) => getStockLevel(r.stock) === 'low').length,
        out: rows.filter((r) => getStockLevel(r.stock) === 'out').length,
    }), [rows]);

    const filteredRows = useMemo(() => rows
        .filter((r) => !searchTerm || r.name.toLowerCase().includes(searchTerm))
        .filter((r) => !filterCategory || r.category === filterCategory)
        .filter((r) => !filterLevel || getStockLevel(r.stock) === filterLevel)
        .filter((r) => !filterStatus || r.status === filterStatus)
        .sort((a, b) => compareRows(a, b, sortConfig) || a.name.localeCompare(b.name, 'es')),
    [rows, searchTerm, filterCategory, filterLevel, filterStatus, sortConfig]);

    // La página se asocia a la combinación de filtros: al cambiar cualquiera vuelve a 1.
    const filterKey = JSON.stringify([searchTerm, filterCategory, filterLevel, filterStatus, sortConfig]);
    const totalPages = getTotalPages(filteredRows.length);
    // Se acota a totalPages: tras "Actualizar" la lista puede achicarse y dejar la página vacía.
    const currentPage = Math.min(pageState.key === filterKey ? pageState.page : 1, Math.max(totalPages, 1));
    const pageRows = filteredRows.slice((currentPage - 1) * ADMIN_PAGE_SIZE, currentPage * ADMIN_PAGE_SIZE);

    const requestSort = (key: SortKey) => {
        const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig({ key, direction });
    };

    const renderThumb = (row: StockRow) => (
        row.imageUrl
            ? <img src={row.imageUrl} alt="" className="table-img" loading="lazy" />
            : <div className="table-img-placeholder" />
    );

    const renderBody = () => {
        if (loading) {
            return (
                <div className="stock-loading" role="status" aria-live="polite">
                    <LiaLoader size="md" />
                    <p>Cargando stock...</p>
                </div>
            );
        }
        if (loadError) {
            return (
                <div className="sales-empty-state" role="alert">
                    <AlertTriangle size={48} className="sales-empty-icon" />
                    <p className="sales-empty-title">No pudimos cargar el stock</p>
                    <p className="sales-empty-subtitle">Revisá tu conexión e intentá de nuevo.</p>
                    <button className="admin-btn-secondary admin-flex-center gap-2" onClick={loadStock}>
                        <RefreshCw size={16} /> Reintentar
                    </button>
                </div>
            );
        }
        if (pageRows.length === 0) {
            return (
                <div className="sales-empty-state">
                    <Package size={48} className="sales-empty-icon" />
                    <p className="sales-empty-title">
                        {hasActiveFilters ? 'No hay productos que coincidan con los filtros' : 'Todavía no hay productos cargados'}
                    </p>
                    <p className="sales-empty-subtitle">
                        {hasActiveFilters
                            ? 'Probá con otros criterios de búsqueda o limpiá los filtros.'
                            : 'Cargá productos desde la sección Productos para controlar su stock acá.'}
                    </p>
                </div>
            );
        }
        return (
            <>
                <ul className="stock-card-list">
                    {pageRows.map((row) => (
                        <li className="stock-card" key={row.id}>
                            {renderThumb(row)}
                            <div className="stock-card-info">
                                <span className="stock-card-name">{row.name}</span>
                                <span className="stock-card-category">{row.category || 'Sin categoría'}</span>
                            </div>
                            <div className="stock-card-badges">
                                <StockBadge stock={row.stock} />
                                {row.status === 'inactive' && <StatusBadge status={row.status} />}
                            </div>
                        </li>
                    ))}
                </ul>

                <table className="admin-table stock-table">
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('name')} className="sortable">Producto <ArrowUpDown size={14} /></th>
                            <th onClick={() => requestSort('category')} className="sortable">Categoría <ArrowUpDown size={14} /></th>
                            <th onClick={() => requestSort('stock')} className="sortable">Stock <ArrowUpDown size={14} /></th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((row) => (
                            <tr key={row.id}>
                                <td>
                                    <div className="stock-product-cell">
                                        {renderThumb(row)}
                                        <span>{row.name}</span>
                                    </div>
                                </td>
                                <td>{row.category || '—'}</td>
                                <td><StockBadge stock={row.stock} /></td>
                                <td><StatusBadge status={row.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <Box display="flex" justifyContent="center" alignItems="center" pt={1} pb={0.5}>
                        <Pagination
                            count={totalPages}
                            page={currentPage}
                            onChange={(_, page) => setPageState({ key: filterKey, page })}
                            size="small"
                            siblingCount={1}
                            boundaryCount={1}
                            color="primary"
                        />
                    </Box>
                )}
            </>
        );
    };

    return (
        <div className="admin-stock-page">
            <div className="admin-page-header admin-flex-between">
                <div>
                    <h1 className="admin-page-title">Stock</h1>
                    <p className="admin-page-subtitle">Controlá el stock de tus productos y detectá los que se están agotando.</p>
                </div>
                <button className="admin-btn-secondary admin-flex-center gap-2" onClick={loadStock} disabled={loading}>
                    <RefreshCw size={16} /> Actualizar
                </button>
            </div>

            <div className="admin-card stock-toolbar">
                <div className="search-input-wrapper">
                    <TextField
                        placeholder="Buscar por nombre de producto..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        fullWidth
                        size="small"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={18} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                </div>
                <div className="toolbar-filters">
                    <TextField select className="filter-select" aria-label="Filtrar por nivel de stock" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} size="small" slotProps={filterSelectSlotProps}>
                        <MenuItem value="">Todo el stock</MenuItem>
                        <MenuItem value="ok">En stock</MenuItem>
                        <MenuItem value="low">Stock bajo (≤{LOW_STOCK_THRESHOLD})</MenuItem>
                        <MenuItem value="out">Sin stock</MenuItem>
                    </TextField>
                    <TextField select className="filter-select" aria-label="Filtrar por categoría" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} size="small" slotProps={filterSelectSlotProps}>
                        <MenuItem value="">Todas las categorías</MenuItem>
                        {categories.map((cat) => (
                            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                        ))}
                    </TextField>
                    <TextField select className="filter-select" aria-label="Filtrar por estado" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} size="small" slotProps={filterSelectSlotProps}>
                        <MenuItem value="">Todos los estados</MenuItem>
                        <MenuItem value="active">Activos</MenuItem>
                        <MenuItem value="inactive">Inactivos</MenuItem>
                    </TextField>
                </div>
            </div>

            <div className="sales-summary">
                <div className="summary-badge total">
                    <span className="summary-value">{loadError ? '—' : counts.total}</span>
                    <span className="summary-label">Productos</span>
                </div>
                <div className="summary-badge ok">
                    <span className="summary-value">{loadError ? '—' : counts.ok}</span>
                    <span className="summary-label">En stock</span>
                </div>
                <div className="summary-badge low">
                    <span className="summary-value">{loadError ? '—' : counts.low}</span>
                    <span className="summary-label">Stock bajo</span>
                </div>
                <div className="summary-badge out">
                    <span className="summary-value">{loadError ? '—' : counts.out}</span>
                    <span className="summary-label">Sin stock</span>
                </div>
            </div>

            <div className="admin-card table-card">{renderBody()}</div>
        </div>
    );
};

export default Stock;
