import { useState, useEffect } from 'react';
import { Search, RefreshCw, ShoppingBag, User, Mail, ArrowUpDown } from 'lucide-react';
import { Box, InputAdornment, MenuItem, Pagination, TextField } from '@mui/material';
import { supabase } from '../../../config/supabaseClient';
import { formatDate, formatPriceInt } from '../../../utils/formatters';
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, SHIPPING_METHOD_LABEL, filterSelectSlotProps } from '../../../utils/labels';
import { usePagination } from '../../../hooks/usePagination';
import { apiFetch, authHeaders, API_BASE_URL } from '../../../utils/apiFetch';
import { getAuthToken } from '../../../utils/auth';
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
    // joined from productos
    current_stock?: number;
}

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

const Sales = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
    const [filterStock, setFilterStock] = useState('');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
    const [confirmingSale, setConfirmingSale] = useState<Sale | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [cancellingSale, setCancellingSale] = useState<Sale | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Sale, direction: 'asc' | 'desc' } | null>(null);

    const loadSales = async () => {
        setLoading(true);
        try {
            const { data: ventasData, error } = await supabase
                .from('ventas')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch current stock for all unique product_ids
            const productIds = [...new Set((ventasData ?? []).map((r) => r.product_id).filter(Boolean))];
            const stockMap: Record<number, number> = {};
            if (productIds.length > 0) {
                const { data: productosData } = await supabase
                    .from('productos')
                    .select('id, stock')
                    .in('id', productIds);
                (productosData ?? []).forEach((p) => { stockMap[p.id] = p.stock; });
            }

            const mapped: Sale[] = (ventasData ?? []).map((row) => ({
                id: row.id,
                buyer_name: row.buyer_name ?? null,
                buyer_email: row.buyer_email ?? null,
                product_id: row.product_id,
                product_name: row.product_name,
                product_image: row.product_image,
                quantity: row.quantity,
                unit_price: row.unit_price,
                total_price: row.total_price,
                units_config: row.units_config,
                payment_method: row.payment_method,
                payment_status: row.payment_status,
                shipping_method: row.shipping_method,
                created_at: row.created_at,
                current_stock: row.product_id != null ? stockMap[row.product_id] : undefined,
            }));
            setSales(mapped);

            // Stock alerts: products with stock <= 5
            const { data: alertsData } = await supabase
                .from('productos')
                .select('id, name, image_url, stock, category')
                .eq('status', 'active')
                .lte('stock', 5)
                .order('stock', { ascending: true });
            setStockAlerts(alertsData ?? []);
        } catch (err) {
            console.error('Error cargando ventas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSales();
    }, []);

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
            setSales((prev) =>
                prev.map((s) => s.id === cancellingSale.id ? { ...s, payment_status: 'cancelado' } : s)
            );
            setCancellingSale(null);
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
            setSales((prev) =>
                prev.map((s) => s.id === confirmingSale.id ? { ...s, payment_status: 'pagado' } : s)
            );
            setConfirmingSale(null);
        } catch {
            alert('Error de red al confirmar el pago');
        } finally {
            setConfirming(false);
        }
    };

    // Filters
    let filtered = sales;

    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((s) =>
            s.product_name.toLowerCase().includes(term) ||
            (s.buyer_name ?? '').toLowerCase().includes(term) ||
            (s.buyer_email ?? '').toLowerCase().includes(term)
        );
    }
    if (filterPaymentStatus) {
        filtered = filtered.filter((s) => getEffectiveStatus(s) === filterPaymentStatus);
    }
    if (filterPaymentMethod) {
        filtered = filtered.filter((s) => s.payment_method === filterPaymentMethod);
    }
    if (filterStock === 'out_of_stock') {
        filtered = filtered.filter((s) => s.current_stock === 0);
    } else if (filterStock === 'low_stock') {
        filtered = filtered.filter((s) => s.current_stock !== undefined && s.current_stock > 0 && s.current_stock <= 5);
    }

    if (sortConfig !== null) {
        const { key, direction } = sortConfig;
        filtered = [...filtered].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            // != null cubre undefined y null (buyer_name/buyer_email/shipping_method).
            if (aVal != null && bVal != null) {
                if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    const requestSort = (key: keyof Sale) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const { currentPage, setCurrentPage, totalPages, paginated } = usePagination(filtered, {
        resetDeps: [searchTerm, filterPaymentStatus, filterPaymentMethod, filterStock],
    });

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
                <button className="admin-btn-secondary admin-flex-center gap-2" onClick={loadSales}>
                    <RefreshCw size={16} /> Actualizar
                </button>
            </div>

            {/* Toolbar */}
            <div className="admin-card sales-toolbar">
                <div className="search-input-wrapper">
                    <TextField
                        placeholder="Buscar por producto, comprador o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                    <span className="summary-value">{sales.length}</span>
                    <span className="summary-label">Total ventas</span>
                </div>
                <div className="summary-badge pending">
                    <span className="summary-value">{sales.filter(s => getEffectiveStatus(s) === 'pendiente').length}</span>
                    <span className="summary-label">Pendientes de pago</span>
                </div>
                <div className="summary-badge paid">
                    <span className="summary-value">{sales.filter(s => s.payment_status === 'pagado').length}</span>
                    <span className="summary-label">Pagadas</span>
                </div>
                <div className="summary-badge no-stock">
                    <span className="summary-value">{sales.filter(s => s.current_stock === 0).length}</span>
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
                    <p className="sales-loading">Cargando ventas...</p>
                ) : filtered.length === 0 ? (
                    <div className="sales-empty-state">
                        <ShoppingBag size={48} className="sales-empty-icon" />
                        <p className="sales-empty-title">
                            {searchTerm || filterPaymentStatus || filterPaymentMethod || filterStock
                                ? 'No hay ventas que coincidan con los filtros'
                                : 'Todavía no hay ventas registradas'}
                        </p>
                        <p className="sales-empty-subtitle">
                            {searchTerm || filterPaymentStatus || filterPaymentMethod || filterStock
                                ? 'Probá con otros criterios de búsqueda o limpiá los filtros.'
                                : 'Las ventas aparecerán aquí en cuanto los clientes completen una compra.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile card list */}
                        <div className="sales-card-list">
                            {paginated.map((sale) => (
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
                                {paginated.map((sale) => (
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
