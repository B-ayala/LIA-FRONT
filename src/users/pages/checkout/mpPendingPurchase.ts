import type { CheckoutItemSource } from '../../../store/cartStore';
import { MP_PAYMENT_WINDOW_MS } from './mpDeadline';

/**
 * Compra de Mercado Pago "en vuelo" de esta pestaña (sessionStorage). Se guarda al redirigir
 * a MP y la consumen /checkout (si el usuario vuelve sin pagar) y /checkout/result.
 * Las keys son las mismas que antes del cambio para no perder compras en curso al desplegar.
 */
const ORDER_IDS_KEY = 'mp_order_ids';
const DEADLINE_KEY = 'mp_deadline';
const OWNER_KEY = 'mp_owner';
const LAST_ORDER_KEY = 'mp_last_order';

export interface LastOrderItem {
  /** Ausente en compras guardadas antes de este cambio: esas líneas no se tocan en el carrito. */
  productId?: string;
  productName: string;
  productImage: string;
  quantity: number;
  totalPrice: number;
}

export interface LastOrder {
  items: LastOrderItem[];
  itemsSubtotal?: number;
  grandTotal: number;
  source?: CheckoutItemSource;
  shippingMethod?: string;
}

export interface PendingMpPurchase {
  orderIds: string[];
  /** E-mail (minúsculas) del usuario que inició la compra; vacío en compras previas a este cambio. */
  ownerEmail: string;
  expired: boolean;
  lastOrder: LastOrder | null;
}

const parseJson = (raw: string | null): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    // Valor corrupto o de otra versión: se trata como ausente.
    return null;
  }
};

const parseOrderIds = (raw: string | null): string[] => {
  const parsed = parseJson(raw);
  return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
};

const isLastOrder = (value: unknown): value is LastOrder =>
  typeof value === 'object'
  && value !== null
  && Array.isArray((value as LastOrder).items)
  && typeof (value as LastOrder).grandTotal === 'number';

export const normalizeEmail = (email: string | null | undefined): string => (email ?? '').trim().toLowerCase();

/** Lee el detalle de la última compra (lo que se muestra en /checkout/result). */
export const readLastOrder = (): LastOrder | null => {
  const parsed = parseJson(sessionStorage.getItem(LAST_ORDER_KEY));
  return isLastOrder(parsed) ? parsed : null;
};

/** Ids de las órdenes de la compra pendiente (respaldo si MP no devuelve external_reference). */
export const readPendingOrderIds = (): string[] => parseOrderIds(sessionStorage.getItem(ORDER_IDS_KEY));

/** Lectura sin efectos: la compra de Mercado Pago sin resolver de esta pestaña, o null si no hay. */
export const readPendingMpPurchase = (now: number = Date.now()): PendingMpPurchase | null => {
  const orderIds = readPendingOrderIds();
  if (orderIds.length === 0) return null;
  const deadline = Number(sessionStorage.getItem(DEADLINE_KEY));
  return {
    orderIds,
    ownerEmail: normalizeEmail(sessionStorage.getItem(OWNER_KEY)),
    // Sin límite guardado no podemos afirmar que venció.
    expired: Number.isFinite(deadline) && deadline > 0 && deadline <= now,
    lastOrder: readLastOrder(),
  };
};

/**
 * Una compra sin dueño registrado (guardada antes de este cambio) se considera del usuario
 * actual: el backend igual rechaza con 403 liberar órdenes ajenas.
 */
export const isPurchaseOwnedBy = (purchase: PendingMpPurchase, email: string): boolean =>
  purchase.ownerEmail === '' || purchase.ownerEmail === normalizeEmail(email);

interface SavePendingInput {
  orderIds: string[];
  ownerEmail: string;
  lastOrder: LastOrder;
  from?: number;
}

export const saveMpPendingPurchase = ({ orderIds, ownerEmail, lastOrder, from = Date.now() }: SavePendingInput): void => {
  sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(lastOrder));
  sessionStorage.setItem(ORDER_IDS_KEY, JSON.stringify(orderIds));
  sessionStorage.setItem(OWNER_KEY, normalizeEmail(ownerEmail));
  sessionStorage.setItem(DEADLINE_KEY, String(from + MP_PAYMENT_WINDOW_MS));
};

/** Olvida la compra pendiente (ya resuelta: liberada, pagada o informada en el resultado). */
export const forgetMpPendingPurchase = (): void => {
  [ORDER_IDS_KEY, DEADLINE_KEY, OWNER_KEY, LAST_ORDER_KEY].forEach((key) => sessionStorage.removeItem(key));
};

/** Ids de producto de la última compra (para sacar del carrito solo lo que se compró). */
export const getPurchasedProductIds = (lastOrder: LastOrder | null): string[] =>
  (lastOrder?.items ?? [])
    .map((item) => item.productId)
    .filter((id): id is string => typeof id === 'string' && id !== '');
