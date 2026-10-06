import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Package, Truck, Store, User, Mail, SendHorizonal, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { Box, MenuItem, Pagination, TextField } from '@mui/material';
import { supabase } from '../../../config/supabaseClient';
import { formatDate, formatPriceInt } from '../../../utils/formatters';
import { SHIPPING_METHOD_LABEL, filterSelectSlotProps } from '../../../utils/labels';
import { RANGE_NOT_SATISFIABLE_CODE, getPageRange, getTotalPages } from '../../../utils/serverPagination';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import './Dispatches.css';

// Filtros, orden y paginación corren en el servidor (.range + count exact).
const DISPATCH_COLUMNS = 'id, buyer_name, buyer_email, product_id, product_name, product_image, quantity, total_price, payment_method, payment_status, shipping_method, dispatch_status, created_at';

type DispatchStatus = 'pendiente' | 'en_preparacion' | 'despachado' | 'listo_para_retiro' | 'entregado';
type PaymentStatus = 'pagado';
type SortKey = 'buyer_name' | 'product_name' | 'created_at' | 'shipping_method' | 'dispatch_status';
interface SortConfig { key: SortKey; direction: 'asc' | 'desc' }

interface DispatchFilters {
    shipping: string;
    dispatch: string;
    sort: SortConfig | null;
}

interface DispatchSummary {
    total: number;
    pending: number;
    preparing: number;
    dispatched: number;
}

const DEFAULT_SORT: SortConfig = { key: 'created_at', direction: 'desc' };
// En la base dispatch_status puede venir null: se lo trata como 'pendiente' (igual que antes en el mapeo).
const PENDING_FILTER = 'dispatch_status.eq.pendiente,dispatch_status.is.null';

interface Dispatch {
    id: string;
    buyer_name: string | null;
    buyer_email: string | null;
    product_id: number | null;
    product_name: string;
    product_image: string | null;
    quantity: number;
    total_price: number;
    payment_method: string;
    payment_status: PaymentStatus;
    shipping_method: string | null;
    dispatch_status: DispatchStatus;
    created_at: string;
}


function ShippingIcon({ method }: { method: string | null }) {
    if (method === 'correo') return <Package size={14} className="shipping-icon correo" />;
    if (method === 'moto') return <Truck size={14} className="shipping-icon moto" />;
    if (method === 'local') return <Store size={14} className="shipping-icon local" />;
    return <SendHorizonal size={14} className="shipping-icon" />;
}

const getDispatchStatusFieldSx = (status: DispatchStatus) => {
    const statusStyles = {
        pendiente: { backgroundColor: '#f1f5f9', color: '#64748b', borderColor: '#cbd5e1' },
        en_preparacion: { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' },
        despachado: { backgroundColor: '#dbeafe', color: '#1d4ed8', borderColor: '#93c5fd' },
        listo_para_retiro: { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' },
        entregado: { backgroundColor: '#f3e8ff', color: '#7c3aed', borderColor: '#c4b5fd' },
    } satisfies Record<DispatchStatus, { backgroundColor: string; color: string; borderColor: string }>;

    const selected = statusStyles[status] ?? statusStyles.pendiente;

    return {
        minWidth: 170,
        '& .MuiOutlinedInput-root': {
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 600,
            backgroundColor: selected.backgroundColor,
            color: selected.color,
            '& fieldset': {
                borderWidth: '1.5px',
                borderColor: selected.borderColor,
            },
            '&:hover fieldset': {
                borderColor: selected.borderColor,
            },
            '&.Mui-focused fieldset': {
                borderColor: selected.borderColor,
            },
        },
        '& .MuiSelect-select': {
            py: '6px',
        },
    };
};

const baseCountQuery = () =>
    supabase.from('ventas').select('id', { count: 'exact', head: true }).eq('payment_status', 'pagado');

const countDispatches = async (build: (q: ReturnType<typeof baseCountQuery>) => ReturnType<typeof baseCountQuery>): Promise<number> => {
    const { count, error } = await build(baseCountQuery());
    if (error) throw error;
    return count ?? 0;
};

const fetchDispatchSummary = async (): Promise<DispatchSummary> => {
    const [total, pending, preparing, dispatched] = await Promise.all([
        countDispatches((q) => q),
        countDispatches((q) => q.or(PENDING_FILTER)),
        countDispatches((q) => q.eq('dispatch_status', 'en_preparacion')),
        countDispatches((q) => q.in('dispatch_status', ['despachado', 'listo_para_retiro'])),
    ]);
    return { total, pending, preparing, dispatched };
};

const fetchDispatchesPage = async (filters: DispatchFilters, page: number): Promise<{ rows: Dispatch[]; totalCount: number }> => {
    let query = supabase
        .from('ventas')
        .select(DISPATCH_COLUMNS, { count: 'exact' })
        .eq('payment_status', 'pagado');

    if (filters.shipping) query = query.eq('shipping_method', filters.shipping);
    if (filters.dispatch === 'pendiente') query = query.or(PENDING_FILTER);
    else if (filters.dispatch) query = query.eq('dispatch_status', filters.dispatch);

    const sort = filters.sort ?? DEFAULT_SORT;
    // id como desempate: con valores repetidos, range() podría duplicar u omitir filas entre páginas.
    query = query
        .order(sort.key, { ascending: sort.direction === 'asc', nullsFirst: false })
        .order('id', { ascending: true });

    const { from, to } = getPageRange(page);
    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    const rows: Dispatch[] = (data ?? []).map((row) => ({
        ...row,
        dispatch_status: row.dispatch_status ?? 'pendiente',
    })) as Dispatch[];
    return { rows, totalCount: count ?? 0 };
};

const Dispatches = () => {
    const [dispatches, setDispatches] = useState<Dispatch[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [summary, setSummary] = useState<DispatchSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [filterShipping, setFilterShipping] = useState('');
    const [filterDispatch, setFilterDispatch] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [pageState, setPageState] = useState({ key: '', page: 1 });
    const requestIdRef = useRef(0);
    const summaryRequestIdRef = useRef(0);

    // La página se asocia a la combinación de filtros: al cambiar cualquiera vuelve a 1
    // sin disparar un fetch intermedio con la página vieja.
    const filterKey = JSON.stringify([filterShipping, filterDispatch, sortConfig]);
    const currentPage = pageState.key === filterKey ? pageState.page : 1;
    const setCurrentPage = (page: number) => setPageState({ key: filterKey, page });
    const totalPages = getTotalPages(totalCount);

    const loadDispatches = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setLoadError(false);
        try {
            const result = await fetchDispatchesPage(
                { shipping: filterShipping, dispatch: filterDispatch, sort: sortConfig },
                currentPage,
            );
            if (requestId !== requestIdRef.current) return;
            setDispatches(result.rows);
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
    }, [filterShipping, filterDispatch, sortConfig, currentPage, filterKey]);

    // Los contadores no dependen de filtros ni página; si fallan quedan en "—" sin tapar la tabla.
    const loadSummary = useCallback(async () => {
        const requestId = ++summaryRequestIdRef.current;
        try {
            const result = await fetchDispatchSummary();
            if (requestId === summaryRequestIdRef.current) setSummary(result);
        } catch {
            if (requestId === summaryRequestIdRef.current) setSummary(null);
        }
    }, []);

    useEffect(() => {
        loadDispatches();
    }, [loadDispatches]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const refreshAll = () => {
        loadDispatches();
        loadSummary();
    };

    const handleChangeDispatchStatus = async (d: Dispatch, newStatus: DispatchStatus) => {
        if (newStatus === d.dispatch_status) return;
        const { error } = await supabase.from('ventas').update({ dispatch_status: newStatus }).eq('id', d.id);
        if (!error) refreshAll();
    };

    const requestSort = (key: SortKey) => {
        const direction = sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig({ key, direction });
    };

    const formatSummaryValue = (value: number | undefined) => value ?? '—';

    return (
        <div className="admin-dispatches-page">
            <div className="admin-page-header admin-flex-between">
                <div>
                    <h1 className="admin-page-title">Despachos</h1>
                    <p className="admin-page-subtitle">Gestioná el estado de preparación y envío de cada pedido.</p>
                </div>
                <button className="dispatch-btn-secondary admin-flex-center gap-2" onClick={refreshAll}>
                    <RefreshCw size={16} /> Actualizar
                </button>
            </div>

            {/* Filters */}
            <div className="admin-card dispatch-toolbar">
                <div className="toolbar-filters">
                    <TextField
                        select
                        className="filter-select"
                        value={filterShipping}
                        onChange={(e) => setFilterShipping(e.target.value)}
                        size="small"
                        slotProps={filterSelectSlotProps}
                    >
                        <MenuItem value="">Todos los envíos</MenuItem>
                        <MenuItem value="correo">Correo Argentino</MenuItem>
                        <MenuItem value="moto">Envío por moto</MenuItem>
                        <MenuItem value="local">Retiro en local</MenuItem>
                    </TextField>
                    <TextField
                        select
                        className="filter-select"
                        value={filterDispatch}
                        onChange={(e) => setFilterDispatch(e.target.value)}
                        size="small"
                        slotProps={filterSelectSlotProps}
                    >
                        <MenuItem value="">Todos los estados</MenuItem>
                        <MenuItem value="pendiente">Pendiente</MenuItem>
                        <MenuItem value="en_preparacion">En preparación</MenuItem>
                        <MenuItem value="despachado">Despachado</MenuItem>
                        <MenuItem value="listo_para_retiro">Listo para retiro</MenuItem>
                        <MenuItem value="entregado">Entregado</MenuItem>
                    </TextField>
                </div>
            </div>

            {/* Summary */}
            <div className="dispatch-summary">
                <div className="dispatch-badge total">
                    <span className="dispatch-badge-value">{formatSummaryValue(summary?.total)}</span>
                    <span className="dispatch-badge-label">Total pedidos</span>
                </div>
                <div className="dispatch-badge pend">
                    <span className="dispatch-badge-value">{formatSummaryValue(summary?.pending)}</span>
                    <span className="dispatch-badge-label">Pendientes</span>
                </div>
                <div className="dispatch-badge prep">
                    <span className="dispatch-badge-value">{formatSummaryValue(summary?.preparing)}</span>
                    <span className="dispatch-badge-label">En preparación</span>
                </div>
                <div className="dispatch-badge done">
                    <span className="dispatch-badge-value">{formatSummaryValue(summary?.dispatched)}</span>
                    <span className="dispatch-badge-label">Despachados / Listos</span>
                </div>
            </div>

            {/* Content */}
            <div className="admin-card table-card">
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 1rem', color: '#666' }}>
                        <LiaLoader size="md" />
                        <p className="dispatch-loading" style={{ margin: 0 }}>Cargando despachos...</p>
                    </div>
                ) : loadError ? (
                    <div className="dispatch-empty-state" role="alert">
                        <AlertTriangle size={48} className="dispatch-empty-icon" />
                        <p className="dispatch-empty-title">No pudimos cargar los despachos</p>
                        <p className="dispatch-empty-subtitle">Revisá tu conexión e intentá de nuevo.</p>
                        <button className="dispatch-btn-secondary admin-flex-center gap-2" onClick={refreshAll}>
                            <RefreshCw size={16} /> Reintentar
                        </button>
                    </div>
                ) : dispatches.length === 0 ? (
                    <div className="dispatch-empty-state">
                        <SendHorizonal size={48} className="dispatch-empty-icon" />
                        <p className="dispatch-empty-title">
                            {filterShipping || filterDispatch
                                ? 'No hay pedidos que coincidan con los filtros'
                                : 'Todavía no hay pedidos pagados'}
                        </p>
                        <p className="dispatch-empty-subtitle">
                            {filterShipping || filterDispatch
                                ? 'Probá con otros criterios o limpiá los filtros.'
                                : 'Los pedidos pagados aparecerán aquí automáticamente.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="dispatch-card-list">
                            {dispatches.map((d) => (
                                    <div className="dispatch-card" key={d.id}>
                                        <div className="dispatch-card-buyer">
                                            <div className="dispatch-card-buyer-row">
                                                <User size={13} className="dispatch-buyer-icon" />
                                                <span className="dispatch-buyer-name">
                                                    {d.buyer_name ?? <span className="dispatch-buyer-missing">Sin nombre</span>}
                                                </span>
                                            </div>
                                            {d.buyer_email && (
                                                <div className="dispatch-card-buyer-row">
                                                    <Mail size={13} className="dispatch-buyer-icon" />
                                                    <span className="dispatch-buyer-email">{d.buyer_email}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="dispatch-card-top">
                                            {d.product_image ? (
                                                <img src={d.product_image} alt={d.product_name} className="dispatch-card-img" />
                                            ) : (
                                                <div className="dispatch-card-img-placeholder" />
                                            )}
                                            <div className="dispatch-card-info">
                                                <span className="dispatch-card-name">{d.product_name}</span>
                                                <span className="dispatch-card-date">{formatDate(d.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="dispatch-card-body">
                                            <div className="dispatch-card-field">
                                                <span className="field-label">Cant.</span>
                                                <span className="field-value">{d.quantity}</span>
                                            </div>
                                            <div className="dispatch-card-field">
                                                <span className="field-label">Total</span>
                                                <span className="field-value">{formatPriceInt(d.total_price)}</span>
                                            </div>
                                            <div className="dispatch-card-field">
                                                <span className="field-label">Envío</span>
                                                <span className="field-value dispatch-shipping-cell">
                                                    <ShippingIcon method={d.shipping_method} />
                                                    {d.shipping_method ? (SHIPPING_METHOD_LABEL[d.shipping_method] ?? d.shipping_method) : '—'}
                                                </span>
                                            </div>
                                            <div className="dispatch-card-field full-width">
                                                <span className="field-label">Estado despacho</span>
                                                <TextField
                                                    select
                                                    className="dispatch-status-select"
                                                    value={d.dispatch_status}
                                                    onChange={(e) => handleChangeDispatchStatus(d, e.target.value as DispatchStatus)}
                                                    size="small"
                                                    sx={getDispatchStatusFieldSx(d.dispatch_status)}
                                                >
                                                    <MenuItem value="pendiente">Pendiente</MenuItem>
                                                    <MenuItem value="en_preparacion">En preparación</MenuItem>
                                                    {d.shipping_method === 'local' ? (
                                                        <MenuItem value="listo_para_retiro">Listo para retiro</MenuItem>
                                                    ) : (
                                                        <MenuItem value="despachado">Despachado</MenuItem>
                                                    )}
                                                    <MenuItem value="entregado">Entregado</MenuItem>
                                                </TextField>
                                            </div>
                                        </div>
                                    </div>
                            ))}
                        </div>

                        {/* Desktop table */}
                        <table className="admin-table dispatch-table">
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
                                    <th onClick={() => requestSort('shipping_method')} className="sortable">
                                        Envío <ArrowUpDown size={14} />
                                    </th>
                                    <th onClick={() => requestSort('dispatch_status')} className="sortable">
                                        Estado despacho <ArrowUpDown size={14} />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {dispatches.map((d) => (
                                    <tr key={d.id}>
                                        <td>
                                            <div className="table-buyer-cell">
                                                <span className="table-buyer-name">
                                                    {d.buyer_name ?? <span className="dispatch-buyer-missing">—</span>}
                                                </span>
                                                {d.buyer_email && (
                                                    <span className="table-buyer-email">{d.buyer_email}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="table-product-cell">
                                                {d.product_image ? (
                                                    <img src={d.product_image} alt={d.product_name} className="table-img" />
                                                ) : (
                                                    <div className="table-img-placeholder" />
                                                )}
                                                <span>{d.product_name}</span>
                                            </div>
                                        </td>
                                        <td className="date-cell">{formatDate(d.created_at)}</td>
                                        <td>
                                            <span className="dispatch-shipping-cell">
                                                <ShippingIcon method={d.shipping_method} />
                                                {d.shipping_method ? (SHIPPING_METHOD_LABEL[d.shipping_method] ?? d.shipping_method) : '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <TextField
                                                select
                                                className="dispatch-status-select"
                                                value={d.dispatch_status}
                                                onChange={(e) =>
                                                    handleChangeDispatchStatus(d, e.target.value as DispatchStatus)
                                                }
                                                size="small"
                                                sx={getDispatchStatusFieldSx(d.dispatch_status)}
                                            >
                                                <MenuItem value="pendiente">Pendiente</MenuItem>
                                                <MenuItem value="en_preparacion">En preparación</MenuItem>
                                                {d.shipping_method === 'local' ? (
                                                    <MenuItem value="listo_para_retiro">Listo para retiro</MenuItem>
                                                ) : (
                                                    <MenuItem value="despachado">Despachado</MenuItem>
                                                )}
                                                <MenuItem value="entregado">Entregado</MenuItem>
                                            </TextField>
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

export default Dispatches;
