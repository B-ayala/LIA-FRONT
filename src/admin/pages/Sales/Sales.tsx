import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw, ShoppingBag, User, Mail, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { Box, InputAdornment, MenuItem, Pagination, TextField } from '@mui/material';
import { supabase } from '../../../config/supabaseClient';
import { formatDate, formatPriceInt } from '../../../utils/formatters';
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, SHIPPING_METHOD_LABEL, filterSelectSlotProps } from '../../../utils/labels';
import { RANGE_NOT_SATISFIABLE_CODE, getPageRange, getTotalPages, sanitizeSearchTerm } from '../../../utils/serverPagination';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { apiFetch, authHeaders, API_BASE_URL } from '../../../utils/apiFetch';
import { getAuthToken } from '../../../utils/auth';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import './Sales.css';

const API_URL = API_BASE_URL;

interface StockAlert {
    id: number;
    name: string;
    image_url: string | null;
    stock: number;
    category: string | null;
}

interface Sale {
    id: string;
    buyer_name: string | null;
    buyer_email: string | null;
    product_id: number | null;
    product_name: string;
    product_image: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    units_config: Record<string, string>[] | null;
    payment_method: string;
    payment_status: 'pendiente' | 'pagado' | 'fallido' | 'expirado' | 'cancelado';
    shipping_method: string | null;
    created_at: string;
}

type SortKey = 'buyer_name' | 'product_name' | 'created_at' | 'quantity' | 'total_price' | 'payment_method' | 'shipping_method' | 'payment_status';
interface SortConfig { key: SortKey; direction: 'asc' | 'desc' }

interface SalesFilters {
    search: string;
    paymentStatus: string;
    paymentMethod: string;
    stock: string;
    sort: SortConfig | null;
}

interface SalesSummary {
    total: number;
    pending: number;
    paid: number;
    outOfStock: number;
}

// Filtros, orden, búsqueda y paginación corren en el servidor (.range + count exact).
const SALES_COLUMNS = 'id, buyer_name, buyer_email, product_id, product_name, product_image, quantity, unit_price, total_price, units_config, payment_method, payment_status, shipping_method, created_at';
const SEARCH_DEBOUNCE_MS = 300;
const LOW_STOCK_THRESHOLD = 5;
// Tope de ids a pasar en .in() para no exceder el largo de URL de PostgREST.
const STOCK_IDS_LIMIT = 500;
const DEFAULT_SORT: SortConfig = { key: 'created_at', direction: 'desc' };

const MP_EXPIRY_MS = 15 * 60 * 1000;
const TRANSFER_EXPIRY_MS = 5 * 60 * 60 * 1000;

// UI-only: muestra como expirado antes de que corra el cron del backend
const getEffectiveStatus = (sale: Sale): Sale['payment_status'] => {
    if (sale.payment_status !== 'pendiente') return sale.payment_status;
    const elapsed = Date.now() - new Date(sale.created_at).getTime();
    if (sale.payment_method === 'mp' && elapsed > MP_EXPIRY_MS) return 'expirado';
    if (sale.payment_method === 'transfer' && elapsed > TRANSFER_EXPIRY_MS) return 'expirado';
    return sale.payment_status;
};

interface FilterableQuery<Q> {
    eq: (column: string, value: string) => Q;
    or: (filters: string) => Q;
}

// Traduce el estado "efectivo" (pendiente vencido = expirado) a condiciones de servidor,
// espejando getEffectiveStatus.
const applyPaymentStatusFilter = <Q extends FilterableQuery<Q>>(query: Q, status: string): Q => {
    const now = Date.now();
    const mpCutoff = new Date(now - MP_EXPIRY_MS).toISOString();
    const transferCutoff = new Date(now - TRANSFER_EXPIRY_MS).toISOString();

    if (status === 'pendiente') {
        return query.eq('payment_status', 'pendiente').or(
            `payment_method.not.in.(mp,transfer),and(payment_method.eq.mp,created_at.gte.${mpCutoff}),and(payment_method.eq.transfer,created_at.gte.${transferCutoff})`,
        );
    }
    if (status === 'expirado') {
        return query.or(
            `payment_status.eq.expirado,and(payment_status.eq.pendiente,payment_method.eq.mp,created_at.lt.${mpCutoff}),and(payment_status.eq.pendiente,payment_method.eq.transfer,created_at.lt.${transferCutoff})`,
        );
    }
    return query.eq('payment_status', status);
};

// El stock vive en `productos`: se resuelven primero los ids y luego se filtra ventas con .in().
const fetchProductIdsByStock = async (kind: 'out_of_stock' | 'low_stock'): Promise<number[]> => {
    const base = supabase.from('productos').select('id').limit(STOCK_IDS_LIMIT);
    const { data, error } = kind === 'out_of_stock'
        ? await base.lte('stock', 0)
        : await base.gt('stock', 0).lte('stock', LOW_STOCK_THRESHOLD);
    if (error) throw error;
    return (data ?? []).map((p) => p.id);
};

const baseCountQuery = () => supabase.from('ventas').select('id', { count: 'exact', head: true });

const countSales = async (build: (q: ReturnType<typeof baseCountQuery>) => ReturnType<typeof baseCountQuery>): Promise<number> => {
    const { count, error } = await build(baseCountQuery());
    if (error) throw error;
    return count ?? 0;
};

const fetchSalesSummary = async (): Promise<SalesSummary> => {
    const outOfStockIds = await fetchProductIdsByStock('out_of_stock');
    const [total, pending, paid, outOfStock] = await Promise.all([
        countSales((q) => q),
        countSales((q) => applyPaymentStatusFilter(q, 'pendiente')),
        countSales((q) => q.eq('payment_status', 'pagado')),
        outOfStockIds.length > 0 ? countSales((q) => q.in('product_id', outOfStockIds)) : Promise.resolve(0),
    ]);
    return { total, pending, paid, outOfStock };
};

interface SalesPageResult {
    rows: Sale[];
    totalCount: number;
}

const fetchSalesPage = async (filters: SalesFilters, page: number): Promise<SalesPageResult> => {
    let stockIds: number[] | null = null;
    if (filters.stock === 'out_of_stock' || filters.stock === 'low_stock') {
        stockIds = await fetchProductIdsByStock(filters.stock);
        if (stockIds.length === 0) return { rows: [], totalCount: 0 };
    }

    let query = supabase.from('ventas').select(SALES_COLUMNS, { count: 'exact' });

    if (filters.paymentStatus) query = applyPaymentStatusFilter(query, filters.paymentStatus);
    if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);
    if (stockIds) query = query.in('product_id', stockIds);
    if (filters.search) {
        const term = `%${filters.search}%`;
        query = query.or(`product_name.ilike.${term},buyer_name.ilike.${term},buyer_email.ilike.${term}`);
    }

    const sort = filters.sort ?? DEFAULT_SORT;
    // id como desempate: con valores repetidos, range() podría duplicar u omitir filas entre páginas.
    query = query
        .order(sort.key, { ascending: sort.direction === 'asc', nullsFirst: false })
        .order('id', { ascending: true });

    const { from, to } = getPageRange(page);
    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return { rows: (data ?? []) as Sale[], totalCount: count ?? 0 };
};

const Sales = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [summary, setSummary] = useState<SalesSummary | null>(null);
    const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
    const [filterStock, setFilterStock] = useState('');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
    const [confirmingSale, setConfirmingSale] = useState<Sale | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [cancellingSale, setCancellingSale] = useState<Sale | null>(null);
    const [cancelling, setCancelling] = useState(false);
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
        setLoadError(false);
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
            setLoadError(true);
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, [searchTerm, filterPaymentStatus, filterPaymentMethod, filterStock, sortConfig, currentPage, filterKey]);

    // Contadores y alertas no dependen de filtros ni página; si fallan quedan en "—" / ocultas
    // sin tapar la tabla.
    const loadSummary = useCallback(async () => {
        const requestId = ++summaryRequestIdRef.current;
        const [summaryResult, alertsResult] = await Promise.allSettled([
            fetchSalesSummary(),
            supabase
                .from('productos')
                .select('id, name, image_url, stock, category')
                .eq('status', 'active')
                .lte('stock', LOW_STOCK_THRESHOLD)
                .order('stock', { ascending: true }),
        ]);
        if (requestId !== summaryRequestIdRef.current) return;
        setSummary(summaryResult.status === 'fulfilled' ? summaryResult.value : null);
        setStockAlerts(alertsResult.status === 'fulfilled' ? (alertsResult.value.data ?? []) : []);
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

    const handleTransferStatusChange = (sale: Sale, newStatus: string) => {
        if (sale.payment_method !== 'transfer' || getEffectiveStatus(sale) !== 'pendiente') return;
        if (newStatus === 'pagado') setConfirmingSale(sale);
        if (newStatus === 'cancelado') setCancellingSale(sale);
    };

    const handleConfirmCancel = async () => {
        if (!cancellingSale) return;
        setCancelling(true);
        try {
            const token = await getAuthToken();
            const res = await apiFetch(`${API_URL}/orders/${cancellingSale.id}/cancel-transfer`, {
                method: 'PATCH',
                headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                alert(body.message ?? 'Error al cancelar la orden');
                return;
            }
            setCancellingSale(null);
            refreshAll();
        } catch {
            alert('Error de red al cancelar la orden');
        } finally {
            setCancelling(false);
        }
    };

    const handleConfirmTransfer = async () => {
        if (!confirmingSale) return;
        setConfirming(true);
        try {
            const token = await getAuthToken();
            const res = await apiFetch(`${API_URL}/orders/${confirmingSale.id}/confirm-transfer`, {
                method: 'PATCH',
                headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                alert(body.message ?? 'Error al confirmar el pago');
                return;
            }
            setConfirmingSale(null);
            refreshAll();
        } catch {
            alert('Error de red al confirmar el pago');
        } finally {
            setConfirming(false);
        }
    };

    const requestSort = (key: SortKey) => {
        const direction = sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig({ key, direction });
    };

    const formatSummaryValue = (value: number | undefined) => value ?? '—';

    return (
        <div className="admin-sales-page">
            {confirmingSale && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <p className="confirm-message">¿Confirmás el pago? Una vez realizada, no se podrá deshacer.</p>
                        <div className="confirm-actions">
                            <button className="admin-btn-secondary" onClick={() => setConfirmingSale(null)} disabled={confirming}>
                                Volver
                            </button>
                            <button className="admin-btn-primary" onClick={handleConfirmTransfer} disabled={confirming}>
                                {confirming ? 'Confirmando...' : 'Confirmar pago'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {cancellingSale && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <p className="confirm-message">¿Cancelar esta orden de transferencia? Esta acción no se puede deshacer.</p>
                        <div className="confirm-actions">
                            <button className="admin-btn-secondary" onClick={() => setCancellingSale(null)} disabled={cancelling}>
                                Volver
                            </button>
                            <button className="admin-btn-danger" onClick={handleConfirmCancel} disabled={cancelling}>
                                {cancelling ? 'Cancelando...' : 'Cancelar orden'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                        <MenuItem value="pagado">Pagado</MenuItem>
                        <MenuItem value="expirado">Expirado</MenuItem>
                        <MenuItem value="fallido">Fallido</MenuItem>
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

            {/* Stock alerts */}
            {stockAlerts.length > 0 && (
                <div className="admin-card stock-alerts-card">
                    <h2 className="stock-alerts-title">Alertas de stock</h2>
                    <div className="stock-alerts-list">
                        {stockAlerts.map((p) => (
                            <div key={p.id} className={`stock-alert-row ${p.stock === 0 ? 'out' : 'low'}`}>
                                {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="stock-alert-img" />
                                ) : (
                                    <div className="stock-alert-img-placeholder" />
                                )}
                                <span className="stock-alert-name">{p.name}</span>
                                {p.category && <span className="stock-alert-category">{p.category}</span>}
                                <span className={`stock-badge ${p.stock === 0 ? 'out' : 'low'}`}>
                                    {p.stock === 0 ? 'Sin stock' : `Stock: ${p.stock}`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                        <p className="sales-empty-subtitle">Revisá tu conexión e intentá de nuevo.</p>
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
                                            <span className="sale-card-date">{formatDate(sale.created_at)}</span>
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
                                            {sale.payment_method === 'transfer' && getEffectiveStatus(sale) === 'pendiente' ? (
                                                <select
                                                    className="transfer-status-select pendiente"
                                                    value="pendiente"
                                                    onChange={(e) => handleTransferStatusChange(sale, e.target.value)}
                                                >
                                                    <option value="pendiente">Pendiente</option>
                                                    <option value="pagado">Pagado</option>
                                                    <option value="cancelado">Cancelado</option>
                                                </select>
                                            ) : (
                                                <span className={`payment-badge ${getEffectiveStatus(sale)}`}>
                                                    {PAYMENT_STATUS_LABEL[getEffectiveStatus(sale)]}
                                                </span>
                                            )}
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
                                        <td className="date-cell">{formatDate(sale.created_at)}</td>
                                        <td>{sale.quantity}</td>
                                        <td className="font-medium">{formatPriceInt(sale.total_price)}</td>
                                        <td>{PAYMENT_METHOD_LABEL[sale.payment_method] ?? sale.payment_method}</td>
                                        <td>{sale.shipping_method ? (SHIPPING_METHOD_LABEL[sale.shipping_method] ?? sale.shipping_method) : '—'}</td>
                                        <td>
                                            {sale.payment_method === 'transfer' && getEffectiveStatus(sale) === 'pendiente' ? (
                                                <select
                                                    className="transfer-status-select pendiente"
                                                    value="pendiente"
                                                    onChange={(e) => handleTransferStatusChange(sale, e.target.value)}
                                                >
                                                    <option value="pendiente">Pendiente</option>
                                                    <option value="pagado">Pagado</option>
                                                    <option value="cancelado">Cancelado</option>
                                                </select>
                                            ) : (
                                                <span className={`payment-badge ${getEffectiveStatus(sale)}`}>
                                                    {PAYMENT_STATUS_LABEL[getEffectiveStatus(sale)]}
                                                </span>
                                            )}
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
