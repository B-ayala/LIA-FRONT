import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw, ShoppingBag, User, Mail, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { Box, InputAdornment, MenuItem, Pagination, TextField } from '@mui/material';
import { formatDate, formatPriceInt } from '../../../utils/formatters';
import { PAYMENT_METHOD_LABEL, SHIPPING_METHOD_LABEL, filterSelectSlotProps } from '../../../utils/labels';
import { RANGE_NOT_SATISFIABLE_CODE, getTotalPages, sanitizeSearchTerm } from '../../../utils/serverPagination';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import ConfirmationModal from '../../../components/common/Modal/ConfirmationModal';
import {
    MISSING_COLUMN_CODE,
    fetchSalesPage,
    fetchSalesSummary,
    type Sale,
    type SalesFilters,
    type SalesSummary,
    type SortConfig,
    type SortKey,
} from './salesQueries';
import SaleStatusCell from './SaleStatusCell';
import SaleConfirmDialog from './SaleConfirmDialog';
import { SALE_ACTIONS, useSaleActions } from './useSaleActions';
import './Sales.css';

const SEARCH_DEBOUNCE_MS = 300;

type LoadError = 'generic' | 'missing_column' | null;

const Sales = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [summary, setSummary] = useState<SalesSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<LoadError>(null);
    const [searchInput, setSearchInput] = useState('');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
    const [filterStock, setFilterStock] = useState('');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [pageState, setPageState] = useState({ key: '', page: 1 });
    const requestIdRef = useRef(0);
    const summaryRequestIdRef = useRef(0);

    const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
    const searchTerm = sanitizeSearchTerm(debouncedSearch);
    const hasActiveFilters = Boolean(searchTerm || filterPaymentStatus || filterPaymentMethod || filterStock);

    // La página se asocia a la combinación de filtros: al cambiar cualquiera vuelve a 1
    // sin disparar un fetch intermedio con la página vieja.
    const filterKey = JSON.stringify([searchTerm, filterPaymentStatus, filterPaymentMethod, filterStock, sortConfig]);
    const currentPage = pageState.key === filterKey ? pageState.page : 1;
    const setCurrentPage = (page: number) => setPageState({ key: filterKey, page });
    const totalPages = getTotalPages(totalCount);

    const loadSales = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setLoadError(null);
        const filters: SalesFilters = {
            search: searchTerm,
            paymentStatus: filterPaymentStatus,
            paymentMethod: filterPaymentMethod,
            stock: filterStock,
            sort: sortConfig,
        };
        try {
            const result = await fetchSalesPage(filters, currentPage);
            if (requestId !== requestIdRef.current) return;
            setSales(result.rows);
            setTotalCount(result.totalCount);
        } catch (err) {
            if (requestId !== requestIdRef.current) return;
            if ((err as { code?: string }).code === RANGE_NOT_SATISFIABLE_CODE && currentPage > 1) {
                setPageState({ key: filterKey, page: 1 });
                return;
            }
            // Columna inexistente = falta la migración de `review_reason` en la base.
            setLoadError((err as { code?: string }).code === MISSING_COLUMN_CODE ? 'missing_column' : 'generic');
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, [searchTerm, filterPaymentStatus, filterPaymentMethod, filterStock, sortConfig, currentPage, filterKey]);

    // Los contadores no dependen de filtros ni página; si fallan quedan en "—" sin tapar la tabla.
    const loadSummary = useCallback(async () => {
        const requestId = ++summaryRequestIdRef.current;
        let result: SalesSummary | null = null;
        try {
            result = await fetchSalesSummary();
        } catch {
            result = null;
        }
        if (requestId !== summaryRequestIdRef.current) return;
        setSummary(result);
    }, []);

    useEffect(() => {
        loadSales();
    }, [loadSales]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const refreshAll = () => {
        loadSales();
        loadSummary();
    };

    const actions = useSaleActions(refreshAll);
    const pendingConfig = actions.pending ? SALE_ACTIONS[actions.pending.action] : null;

    const requestSort = (key: SortKey) => {
        const direction = sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig({ key, direction });
    };

    const formatSummaryValue = (value: number | undefined) => value ?? '—';

    return (
        <div className="admin-sales-page">
            {pendingConfig && (
                <SaleConfirmDialog
                    message={pendingConfig.prompt}
                    confirmLabel={pendingConfig.confirmLabel}
                    busyLabel={pendingConfig.busyLabel}
                    danger={pendingConfig.danger}
                    busy={actions.busy}
                    onConfirm={actions.run}
                    onCancel={actions.dismiss}
                />
            )}
            <ConfirmationModal
                isOpen={actions.feedback !== null}
                onClose={actions.clearFeedback}
                title={actions.feedback?.title ?? ''}
                message={actions.feedback?.message ?? ''}
                status={actions.feedback?.status ?? 'info'}
                actionButtonText="Entendido"
            />
            <div className="admin-page-header admin-flex-between">
                <div>
                    <h1 className="admin-page-title">Ventas</h1>
                    <p className="admin-page-subtitle">Historial de productos vendidos y estado de pagos.</p>
                </div>
                <button className="admin-btn-secondary admin-flex-center gap-2" onClick={refreshAll}>
                    <RefreshCw size={16} /> Actualizar
                </button>
            </div>

            {/* Toolbar */}
            <div className="admin-card sales-toolbar">
                <div className="search-input-wrapper">
                    <TextField
                        placeholder="Buscar por producto, comprador o email..."
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
                    <TextField
                        select
                        className="filter-select"
                        value={filterPaymentStatus}
                        onChange={(e) => setFilterPaymentStatus(e.target.value)}
                        size="small"
                        slotProps={filterSelectSlotProps}
                    >
                        <MenuItem value="">Todos los pagos</MenuItem>
                        <MenuItem value="pendiente">Pendiente</MenuItem>
                        <MenuItem value="en_proceso">Pago en proceso</MenuItem>
                        <MenuItem value="pagado">Pagado</MenuItem>
                        <MenuItem value="expirado">Expirado</MenuItem>
                        <MenuItem value="cancelado">Cancelado</MenuItem>
                    </TextField>
                    <TextField
                        select
                        className="filter-select"
                        value={filterPaymentMethod}
                        onChange={(e) => setFilterPaymentMethod(e.target.value)}
                        size="small"
                        slotProps={filterSelectSlotProps}
                    >
                        <MenuItem value="">Todos los métodos</MenuItem>
                        <MenuItem value="mp">Mercado Pago</MenuItem>
                        <MenuItem value="transfer">Transferencia</MenuItem>
                    </TextField>
                    <TextField
                        select
                        className="filter-select"
                        value={filterStock}
                        onChange={(e) => setFilterStock(e.target.value)}
                        size="small"
                        slotProps={filterSelectSlotProps}
                    >
                        <MenuItem value="">Todo el stock</MenuItem>
                        <MenuItem value="low_stock">Stock bajo (≤5)</MenuItem>
                        <MenuItem value="out_of_stock">Sin stock</MenuItem>
                    </TextField>
                </div>
            </div>

            {/* Summary badges */}
            <div className="sales-summary">
                <div className="summary-badge total">
                    <span className="summary-value">{formatSummaryValue(summary?.total)}</span>
                    <span className="summary-label">Total ventas</span>
                </div>
                <div className="summary-badge pending">
                    <span className="summary-value">{formatSummaryValue(summary?.pending)}</span>
                    <span className="summary-label">Pendientes de pago</span>
                </div>
                <div className="summary-badge paid">
                    <span className="summary-value">{formatSummaryValue(summary?.paid)}</span>
                    <span className="summary-label">Pagadas</span>
                </div>
                <div className="summary-badge no-stock">
                    <span className="summary-value">{formatSummaryValue(summary?.outOfStock)}</span>
                    <span className="summary-label">Con producto sin stock</span>
                </div>
            </div>

            {/* Table */}
            <div className="admin-card table-card">
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 1rem', color: '#666' }}>
                        <LiaLoader size="md" />
                        <p className="sales-loading" style={{ margin: 0 }}>Cargando ventas...</p>
                    </div>
                ) : loadError ? (
                    <div className="sales-empty-state" role="alert">
                        <AlertTriangle size={48} className="sales-empty-icon" />
                        <p className="sales-empty-title">No pudimos cargar las ventas</p>
                        <p className="sales-empty-subtitle">
                            {loadError === 'missing_column'
                                ? 'Falta aplicar la migración de la base que agrega la columna "review_reason". Aplicala y reintentá.'
                                : 'Revisá tu conexión e intentá de nuevo.'}
                        </p>
                        <button className="admin-btn-secondary admin-flex-center gap-2" onClick={refreshAll}>
                            <RefreshCw size={16} /> Reintentar
                        </button>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="sales-empty-state">
                        <ShoppingBag size={48} className="sales-empty-icon" />
                        <p className="sales-empty-title">
                            {hasActiveFilters
                                ? 'No hay ventas que coincidan con los filtros'
                                : 'Todavía no hay ventas registradas'}
                        </p>
                        <p className="sales-empty-subtitle">
                            {hasActiveFilters
                                ? 'Probá con otros criterios de búsqueda o limpiá los filtros.'
                                : 'Las ventas aparecerán aquí en cuanto los clientes completen una compra.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile card list */}
                        <div className="sales-card-list">
                            {sales.map((sale) => (
                                <div className="sale-card" key={sale.id}>
                                    {/* Buyer info section */}
                                    <div className="sale-card-buyer">
                                        <div className="sale-card-buyer-row">
                                            <User size={13} className="sale-card-buyer-icon" />
                                            <span className="sale-card-buyer-name">
                                                {sale.buyer_name ?? <span className="sale-buyer-missing">Sin nombre</span>}
                                            </span>
                                        </div>
                                        {sale.buyer_email && (
                                            <div className="sale-card-buyer-row">
                                                <Mail size={13} className="sale-card-buyer-icon" />
                                                <span className="sale-card-buyer-email">{sale.buyer_email}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="sale-card-top">
                                        {sale.product_image ? (
                                            <img src={sale.product_image} alt={sale.product_name} className="sale-card-img" />
                                        ) : (
                                            <div className="sale-card-img-placeholder" />
                                        )}
                                        <div className="sale-card-info">
                                            <span className="sale-card-name">{sale.product_name}</span>
                                            <span className="sale-card-date">
                                                {sale.order_number != null && <strong>Pedido #{sale.order_number} · </strong>}
                                                {formatDate(sale.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="sale-card-body">
                                        <div className="sale-card-field">
                                            <span className="field-label">Cant.</span>
                                            <span className="field-value">{sale.quantity}</span>
                                        </div>
                                        <div className="sale-card-field">
                                            <span className="field-label">Total</span>
                                            <span className="field-value">{formatPriceInt(sale.total_price)}</span>
                                        </div>
                                        <div className="sale-card-field">
                                            <span className="field-label">Pago</span>
                                            <span className="field-value">{PAYMENT_METHOD_LABEL[sale.payment_method] ?? sale.payment_method}</span>
                                        </div>
                                        <div className="sale-card-field">
                                            <span className="field-label">Estado pago</span>
                                            <SaleStatusCell sale={sale} onRequest={actions.request} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop table */}
                        <table className="admin-table sales-table">
                            <thead>
                                <tr>
                                    <th onClick={() => requestSort('buyer_name')} className="sortable">
                                        Comprador <ArrowUpDown size={14} />
                                    </th>
                                    <th onClick={() => requestSort('product_name')} className="sortable">
                                        Producto <ArrowUpDown size={14} />
                                    </th>
                                    <th>Pedido</th>
                                    <th onClick={() => requestSort('created_at')} className="sortable">
                                        Fecha <ArrowUpDown size={14} />
                                    </th>
                                    <th onClick={() => requestSort('quantity')} className="sortable">
                                        Cant. <ArrowUpDown size={14} />
                                    </th>
                                    <th onClick={() => requestSort('total_price')} className="sortable">
                                        Total <ArrowUpDown size={14} />
                                    </th>
                                    <th onClick={() => requestSort('payment_method')} className="sortable">
                                        Método pago <ArrowUpDown size={14} />
                                    </th>
                                    <th onClick={() => requestSort('shipping_method')} className="sortable">
                                        Envío <ArrowUpDown size={14} />
                                    </th>
                                    <th onClick={() => requestSort('payment_status')} className="sortable">
                                        Estado pago <ArrowUpDown size={14} />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td>
                                            <div className="table-buyer-cell">
                                                <span className="table-buyer-name">
                                                    {sale.buyer_name ?? <span className="sale-buyer-missing">—</span>}
                                                </span>
                                                {sale.buyer_email && (
                                                    <span className="table-buyer-email">{sale.buyer_email}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="table-product-cell">
                                                {sale.product_image ? (
                                                    <img src={sale.product_image} alt={sale.product_name} className="table-img" />
                                                ) : (
                                                    <div className="table-img-placeholder" />
                                                )}
                                                <span>{sale.product_name}</span>
                                            </div>
                                        </td>
                                        <td>{sale.order_number != null ? `#${sale.order_number}` : '—'}</td>
                                        <td className="date-cell">{formatDate(sale.created_at)}</td>
                                        <td>{sale.quantity}</td>
                                        <td className="font-medium">{formatPriceInt(sale.total_price)}</td>
                                        <td>{PAYMENT_METHOD_LABEL[sale.payment_method] ?? sale.payment_method}</td>
                                        <td>{sale.shipping_method ? (SHIPPING_METHOD_LABEL[sale.shipping_method] ?? sale.shipping_method) : '—'}</td>
                                        <td>
                                            <SaleStatusCell sale={sale} onRequest={actions.request} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <Box display="flex" justifyContent="center" alignItems="center" pt={1} pb={0.5}>
                                <Pagination
                                    count={totalPages}
                                    page={currentPage}
                                    onChange={(_, page) => setCurrentPage(page)}
                                    size="small"
                                    siblingCount={1}
                                    boundaryCount={1}
                                    color="primary"
                                />
                            </Box>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Sales;
