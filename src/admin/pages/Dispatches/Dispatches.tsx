import { useState, useEffect } from 'react';
import { RefreshCw, Package, Truck, Store, User, Mail, SendHorizonal } from 'lucide-react';
import { Box, MenuItem, Pagination, TextField } from '@mui/material';
import { supabase } from '../../../config/supabaseClient';
import { formatDate, formatPriceInt } from '../../../utils/formatters';
import { DISPATCH_STATUS_LABEL, SHIPPING_METHOD_LABEL, filterSelectSlotProps } from '../../../utils/labels';
import { usePagination } from '../../../hooks/usePagination';
import './Dispatches.css';

type DispatchStatus = 'pendiente' | 'en_preparacion' | 'despachado' | 'listo_para_retiro' | 'entregado';
type PaymentStatus = 'pagado';

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

function nextDispatchStatus(current: DispatchStatus, shippingMethod: string | null): DispatchStatus {
    if (current === 'pendiente') return 'en_preparacion';
    if (current === 'en_preparacion') return shippingMethod === 'local' ? 'listo_para_retiro' : 'despachado';
    return current;
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

const Dispatches = () => {
    const [dispatches, setDispatches] = useState<Dispatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterShipping, setFilterShipping] = useState('');
    const [filterDispatch, setFilterDispatch] = useState('');

    const loadDispatches = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ventas')
                .select('id, buyer_name, buyer_email, product_id, product_name, product_image, quantity, total_price, payment_method, payment_status, shipping_method, dispatch_status, created_at')
                .eq('payment_status', 'pagado')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mapped: Dispatch[] = (data ?? []).map((row) => ({
                id: row.id,
                buyer_name: row.buyer_name ?? null,
                buyer_email: row.buyer_email ?? null,
                product_id: row.product_id,
                product_name: row.product_name,
                product_image: row.product_image,
                quantity: row.quantity,
                total_price: row.total_price,
                payment_method: row.payment_method,
                payment_status: row.payment_status,
                shipping_method: row.shipping_method,
                dispatch_status: row.dispatch_status ?? 'pendiente',
                created_at: row.created_at,
            }));
            setDispatches(mapped);
        } catch (err) {
            console.error('Error cargando despachos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDispatches();
    }, []);

    const handleAdvanceDispatch = async (d: Dispatch) => {
        const newStatus = nextDispatchStatus(d.dispatch_status, d.shipping_method);
        if (newStatus === d.dispatch_status) return;
        const { error } = await supabase.from('ventas').update({ dispatch_status: newStatus }).eq('id', d.id);
        if (!error) {
            setDispatches((prev) => prev.map((x) => x.id === d.id ? { ...x, dispatch_status: newStatus } : x));
        }
    };

    const handleChangeDispatchStatus = async (d: Dispatch, newStatus: DispatchStatus) => {
        if (newStatus === d.dispatch_status) return;
        const { error } = await supabase.from('ventas').update({ dispatch_status: newStatus }).eq('id', d.id);
        if (!error) {
            setDispatches((prev) => prev.map((x) => x.id === d.id ? { ...x, dispatch_status: newStatus } : x));
        }
    };

    // Filters
    let filtered = dispatches;
    if (filterShipping) filtered = filtered.filter((d) => d.shipping_method === filterShipping);
    if (filterDispatch) filtered = filtered.filter((d) => d.dispatch_status === filterDispatch);

    const { currentPage, setCurrentPage, totalPages, paginated } = usePagination(filtered, {
        resetDeps: [filterShipping, filterDispatch],
    });

    const countBy = (status: DispatchStatus) => dispatches.filter((d) => d.dispatch_status === status).length;
    const countDispatched = dispatches.filter((d) => d.dispatch_status === 'despachado' || d.dispatch_status === 'listo_para_retiro').length;

    return (
        <div className="admin-dispatches-page">
            <div className="admin-page-header admin-flex-between">
                <div>
                    <h1 className="admin-page-title">Despachos</h1>
                    <p className="admin-page-subtitle">Gestioná el estado de preparación y envío de cada pedido.</p>
                </div>
                <button className="dispatch-btn-secondary admin-flex-center gap-2" onClick={loadDispatches}>
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
                        fullWidth
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
                        fullWidth
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
                    <span className="dispatch-badge-value">{dispatches.length}</span>
                    <span className="dispatch-badge-label">Total pedidos</span>
                </div>
                <div className="dispatch-badge pend">
                    <span className="dispatch-badge-value">{countBy('pendiente')}</span>
                    <span className="dispatch-badge-label">Pendientes</span>
                </div>
                <div className="dispatch-badge prep">
                    <span className="dispatch-badge-value">{countBy('en_preparacion')}</span>
                    <span className="dispatch-badge-label">En preparación</span>
                </div>
                <div className="dispatch-badge done">
                    <span className="dispatch-badge-value">{countDispatched}</span>
                    <span className="dispatch-badge-label">Despachados / Listos</span>
                </div>
            </div>

            {/* Content */}
            <div className="admin-card table-card">
                {loading ? (
                    <p className="dispatch-loading">Cargando despachos...</p>
                ) : filtered.length === 0 ? (
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
                            {paginated.map((d) => {
                                const isTerminal =
                                    d.dispatch_status === 'despachado' || d.dispatch_status === 'listo_para_retiro' || d.dispatch_status === 'entregado';
                                return (
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
                                                <div className="dispatch-status-row">
                                                    <span className={`dispatch-status-badge ${d.dispatch_status}`}>
                                                        {DISPATCH_STATUS_LABEL[d.dispatch_status]}
                                                    </span>
                                                    {!isTerminal && (
                                                        <button
                                                            className="dispatch-advance-btn"
                                                            onClick={() => handleAdvanceDispatch(d)}
                                                            title="Avanzar al siguiente estado"
                                                        >
                                                            Avanzar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop table */}
                        <table className="admin-table dispatch-table">
                            <thead>
                                <tr>
                                    <th>Comprador</th>
                                    <th>Producto</th>
                                    <th>Fecha</th>
                                    <th>Envío</th>
                                    <th>Estado despacho</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((d) => (
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
