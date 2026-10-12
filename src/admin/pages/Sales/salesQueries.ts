import { supabase } from '../../../config/supabaseClient';
import { getPageRange } from '../../../utils/serverPagination';

export type PaymentStatus = 'pendiente' | 'pagado' | 'expirado' | 'cancelado';
/** `en_proceso` es solo de UI: una venta MP pendiente que el backend todavía retiene. */
export type DisplayStatus = PaymentStatus | 'en_proceso';
export type ReviewReason = 'amount_mismatch' | 'duplicate_payment' | 'refunded' | 'charged_back';

export interface Sale {
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
  payment_status: PaymentStatus;
  shipping_method: string | null;
  oversold: boolean;
  review_reason: ReviewReason | null;
  created_at: string;
}

export type SortKey = 'buyer_name' | 'product_name' | 'created_at' | 'quantity' | 'total_price' | 'payment_method' | 'shipping_method' | 'payment_status';
export interface SortConfig { key: SortKey; direction: 'asc' | 'desc' }

export interface SalesFilters {
  search: string;
  paymentStatus: string;
  paymentMethod: string;
  stock: string;
  sort: SortConfig | null;
}

export interface SalesSummary {
  total: number;
  pending: number;
  paid: number;
  outOfStock: number;
}

export interface SalesPageResult {
  rows: Sale[];
  totalCount: number;
}

// Filtros, orden, búsqueda y paginación corren en el servidor (.range + count exact).
// `review_reason` requiere la migración del backend: si falta, la query falla y la vista
// muestra el error con "Reintentar" (nunca una tabla vacía).
const SALES_COLUMNS = 'id, buyer_name, buyer_email, product_id, product_name, product_image, quantity, unit_price, total_price, units_config, payment_method, payment_status, shipping_method, oversold, review_reason, created_at';
const LOW_STOCK_THRESHOLD = 5;
// Tope de ids a pasar en .in() para no exceder el largo de URL de PostgREST.
const STOCK_IDS_LIMIT = 500;
const DEFAULT_SORT: SortConfig = { key: 'created_at', direction: 'desc' };
/** Postgres "undefined_column": falta aplicar una migración (p. ej. `review_reason`). */
export const MISSING_COLUMN_CODE = '42703';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
// MP: el cliente tiene 15 min para pagar, pero el backend retiene la reserva hasta 24 h
// mientras Mercado Pago pueda acreditar (pago en efectivo, revisión, etc.).
const MP_PAYMENT_WINDOW_MS = 15 * MINUTE_MS;
const MP_HOLD_MS = 24 * HOUR_MS;
const TRANSFER_EXPIRY_MS = 5 * HOUR_MS;

/** Estado a mostrar: anticipa lo que hará el sweep del backend sin esperar a que corra. */
export const getEffectiveStatus = (sale: Sale, now: number = Date.now()): DisplayStatus => {
  if (sale.payment_status !== 'pendiente') return sale.payment_status;
  const elapsed = now - new Date(sale.created_at).getTime();
  if (sale.payment_method === 'mp') {
    if (elapsed > MP_HOLD_MS) return 'expirado';
    return elapsed > MP_PAYMENT_WINDOW_MS ? 'en_proceso' : 'pendiente';
  }
  if (sale.payment_method === 'transfer' && elapsed > TRANSFER_EXPIRY_MS) return 'expirado';
  return 'pendiente';
};

interface FilterableQuery<Q> {
  eq: (column: string, value: string) => Q;
  or: (filters: string) => Q;
  lt: (column: string, value: string) => Q;
  gte: (column: string, value: string) => Q;
}

const cutoff = (now: number, ms: number): string => new Date(now - ms).toISOString();

/** Traduce el estado "efectivo" a condiciones de servidor, espejando getEffectiveStatus. */
export const applyPaymentStatusFilter = <Q extends FilterableQuery<Q>>(query: Q, status: string, now: number = Date.now()): Q => {
  const mpWindow = cutoff(now, MP_PAYMENT_WINDOW_MS);
  const mpHold = cutoff(now, MP_HOLD_MS);
  const transfer = cutoff(now, TRANSFER_EXPIRY_MS);

  if (status === 'pendiente') {
    return query.eq('payment_status', 'pendiente').or(
      `payment_method.not.in.(mp,transfer),and(payment_method.eq.mp,created_at.gte.${mpWindow}),and(payment_method.eq.transfer,created_at.gte.${transfer})`,
    );
  }
  if (status === 'en_proceso') {
    return query.eq('payment_status', 'pendiente').eq('payment_method', 'mp').lt('created_at', mpWindow).gte('created_at', mpHold);
  }
  if (status === 'expirado') {
    return query.or(
      `payment_status.eq.expirado,and(payment_status.eq.pendiente,payment_method.eq.mp,created_at.lt.${mpHold}),and(payment_status.eq.pendiente,payment_method.eq.transfer,created_at.lt.${transfer})`,
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

export const fetchSalesSummary = async (): Promise<SalesSummary> => {
  const outOfStockIds = await fetchProductIdsByStock('out_of_stock');
  const [total, pending, paid, outOfStock] = await Promise.all([
    countSales((q) => q),
    countSales((q) => applyPaymentStatusFilter(q, 'pendiente')),
    countSales((q) => q.eq('payment_status', 'pagado')),
    outOfStockIds.length > 0 ? countSales((q) => q.in('product_id', outOfStockIds)) : Promise.resolve(0),
  ]);
  return { total, pending, paid, outOfStock };
};

export const fetchSalesPage = async (filters: SalesFilters, page: number): Promise<SalesPageResult> => {
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
