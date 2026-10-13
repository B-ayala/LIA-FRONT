import { apiFetch, API_BASE_URL } from '../utils/apiFetch';
import { timeoutSignal } from '../utils/withTimeout';
import type { UnitVariants } from '../store/cartStore';

// Crear la orden incluye reservar stock y (en MP) hablar con Mercado Pago: 20 s cubre una
// conexión lenta sin dejar al usuario esperando para siempre. Reintentar reutiliza la
// misma Idempotency-Key, así que un timeout nunca duplica la compra.
const ORDER_CREATE_TIMEOUT_MS = 20_000;
const ORDER_ACTION_TIMEOUT_MS = 12_000;

export type CheckoutStockErrorCode =
  | 'OUT_OF_STOCK'
  | 'SIZE_OUT_OF_STOCK'
  | 'SIZE_UNAVAILABLE'
  | 'SIZE_REQUIRED'
  | 'INVALID_VARIANT';

const STOCK_ERROR_CODES: ReadonlySet<string> = new Set<CheckoutStockErrorCode>([
  'OUT_OF_STOCK',
  'SIZE_OUT_OF_STOCK',
  'SIZE_UNAVAILABLE',
  'SIZE_REQUIRED',
  'INVALID_VARIANT',
]);

/** Problema de stock/talle de una línea concreta del pedido (contrato C2 del backend). */
export class CheckoutStockError extends Error {
  readonly code: CheckoutStockErrorCode;
  readonly productId: string;
  readonly size?: string;

  constructor(message: string, code: CheckoutStockErrorCode, productId: string, size?: string) {
    super(message);
    this.name = 'CheckoutStockError';
    this.code = code;
    this.productId = productId;
    this.size = size;
  }
}

interface OrderErrorBody {
  code?: unknown;
  message?: unknown;
  productId?: unknown;
  size?: unknown;
}

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

export const INVALID_PRODUCT_PRICE_MESSAGE = 'Este producto no esta disponible para la compra porque no tiene un precio valido asignado.';

const INVALID_PRODUCT_DATA_MESSAGE = 'No se pudo procesar la compra porque los datos del producto son invalidos.';

export interface OrderLineItemPayload {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitsConfig: UnitVariants[];
}

export interface CreateOrderPayload {
  buyerName: string;
  buyerEmail: string;
  items: OrderLineItemPayload[];
  paymentMethod: string;
  shippingMethod?: string;
  shippingCost?: number;
  totalPrice: number;
}

const validateOrderItemPayload = (item: OrderLineItemPayload): string | null => {
  if (item.productName.trim() === '') {
    return INVALID_PRODUCT_DATA_MESSAGE;
  }

  if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
    return 'No se pudo procesar la compra porque la cantidad seleccionada es invalida.';
  }

  if (!Number.isFinite(item.unitPrice) || item.unitPrice <= 0) {
    return INVALID_PRODUCT_PRICE_MESSAGE;
  }

  if (!Number.isFinite(item.totalPrice) || item.totalPrice <= 0) {
    return 'No se pudo procesar la compra porque el total calculado es invalido.';
  }

  return null;
};

const validateOrderPayload = (payload: CreateOrderPayload): string | null => {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return 'No hay productos en el carrito para procesar la compra.';
  }

  for (const item of payload.items) {
    const itemValidationError = validateOrderItemPayload(item);

    if (itemValidationError) {
      return itemValidationError;
    }
  }

  if (!Number.isFinite(payload.totalPrice) || payload.totalPrice <= 0) {
    return 'No se pudo procesar la compra porque el total final es invalido.';
  }

  return null;
};

// El backend deduplica reintentos del mismo intento de compra por esta key (8-128 chars [A-Za-z0-9_-]).
const jsonHeaders = (idempotencyKey?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
});

const normalizeOrderErrorMessage = (message?: string): string => {
  if (!message) {
    return 'No se pudo conectar con el sistema de pagos. Intenta de nuevo o elegi transferencia.';
  }

  if (message.includes('unitPrice') || message.includes('totalPrice')) {
    return INVALID_PRODUCT_PRICE_MESSAGE;
  }

  if (message.includes('productName') || message.includes('quantity')) {
    return INVALID_PRODUCT_DATA_MESSAGE;
  }

  return message;
};

/** Error de creación de orden: tipado si es un problema de stock con producto identificado. */
const buildOrderError = async (res: Response): Promise<Error> => {
  const body = (await res.json().catch(() => ({}))) as OrderErrorBody;
  const message = normalizeOrderErrorMessage(asOptionalString(body.message));
  const code = asOptionalString(body.code);
  const productId = asOptionalString(body.productId);
  if (code && productId && STOCK_ERROR_CODES.has(code)) {
    return new CheckoutStockError(message, code as CheckoutStockErrorCode, productId, asOptionalString(body.size));
  }
  return new Error(message);
};

/**
 * Crea una orden de transferencia bancaria vía backend (POST /api/orders/transfer).
 * El backend usa credenciales de service role, evitando el bloqueo por RLS de Supabase.
 * Devuelve los ids de las líneas creadas (para el nudge post-WhatsApp).
 */
export const createOrder = async (payload: CreateOrderPayload, idempotencyKey?: string): Promise<string[]> => {
  const validationError = validateOrderPayload(payload);
  if (validationError) {
    throw new Error(validationError);
  }

  const res = await apiFetch(`${API_BASE_URL}/orders/transfer`, {
    method: 'POST',
    headers: jsonHeaders(idempotencyKey),
    signal: timeoutSignal(ORDER_CREATE_TIMEOUT_MS),
    body: JSON.stringify({
      buyerName: payload.buyerName,
      buyerEmail: payload.buyerEmail,
      items: payload.items,
      shippingMethod: payload.shippingMethod,
      shippingCost: payload.shippingCost,
      totalPrice: payload.totalPrice,
    }),
  });

  if (!res.ok) throw await buildOrderError(res);

  const data = await res.json().catch(() => null);
  return ((data?.order_ids ?? []) as string[]);
};

export type NudgeResponse = 'confirmado' | 'sin_confirmar' | 'abandonado';

/**
 * Registra la respuesta del nudge post-WhatsApp (checkout transferencia).
 * 'abandonado' cancela las órdenes y devuelve stock en el backend; el resto solo
 * deja la señal de conversión. Si falla, el sweep del backend igual las expira.
 */
export const recordNudge = async (orderIds: string[], response: NudgeResponse): Promise<void> => {
  if (orderIds.length === 0) return;

  const res = await apiFetch(`${API_BASE_URL}/orders/nudge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds, response }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'No se pudo registrar la respuesta.');
  }
};

export interface MpPreferenceResult {
  init_point: string;
  order_ids: string[];
}

/** Llama al backend para crear una preferencia de Mercado Pago y registrar la venta. */
export const createMpPreference = async (
  payload: Omit<CreateOrderPayload, 'paymentMethod'>,
  idempotencyKey?: string
): Promise<MpPreferenceResult> => {
  const validationError = validateOrderPayload({ ...payload, paymentMethod: 'mp' });
  if (validationError) {
    throw new Error(validationError);
  }

  const res = await apiFetch(`${API_BASE_URL}/orders/mp-preference`, {
    method: 'POST',
    headers: jsonHeaders(idempotencyKey),
    signal: timeoutSignal(ORDER_CREATE_TIMEOUT_MS),
    body: JSON.stringify({
      buyerName: payload.buyerName,
      buyerEmail: payload.buyerEmail,
      items: payload.items,
      shippingMethod: payload.shippingMethod,
      shippingCost: payload.shippingCost,
      totalPrice: payload.totalPrice,
    }),
  });

  if (!res.ok) throw await buildOrderError(res);

  const data = await res.json().catch(() => null);

  // Sin esta validación, un init_point ausente terminaba en
  // window.location.href = undefined ("about:undefined") en el checkout.
  if (!data || typeof data.init_point !== 'string' || data.init_point === '') {
    throw new Error(normalizeOrderErrorMessage(undefined));
  }

  return { init_point: data.init_point, order_ids: data.order_ids ?? [] };
};

export interface Purchase {
  id: string;
  product_id: string | number | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  units_config: Record<string, string>[] | null;
  payment_method: string;
  payment_status: string;
  shipping_method: string | null;
  dispatch_status: string | null;
  created_at: string;
}

/**
 * Obtiene las compras del usuario por email: las pagadas y las transferencias con comprobante
 * avisado (aún pendientes de verificación, o canceladas/expiradas por el admin; ver `payment_status`).
 * Usa el backend para bypassear RLS de Supabase.
 */
export const getUserPurchases = async (email: string, signal?: AbortSignal): Promise<Purchase[]> => {
  const res = await apiFetch(`${API_BASE_URL}/orders/user?email=${encodeURIComponent(email)}`, { signal });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Error al cargar tus compras.');
  }
  const data = await res.json();
  return (data.orders ?? []) as Purchase[];
};

export type MpCancelOutcome = 'released' | 'held' | 'paid' | 'error';

const MP_CANCEL_OUTCOMES: ReadonlySet<string> = new Set(['released', 'held', 'paid']);

/**
 * Pide liberar la reserva de una compra de Mercado Pago (todas sus órdenes en un solo
 * request). El backend decide contra MP: `released` (stock devuelto o ya estaba liberada),
 * `held` (hay un pago en curso o MP no respondió: no se cancela) o `paid` (ya se acreditó).
 * `error` = no sabemos qué pasó (red, timeout, 4xx/5xx): el caller lo muestra y permite reintentar.
 */
export const cancelMpOrders = async (orderIds: string[]): Promise<MpCancelOutcome> => {
  if (orderIds.length === 0) return 'released';
  try {
    const res = await apiFetch(`${API_BASE_URL}/orders/mp-cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds }),
      signal: timeoutSignal(ORDER_ACTION_TIMEOUT_MS),
    });
    if (!res.ok) return 'error';
    const data = (await res.json().catch(() => null)) as { outcome?: unknown } | null;
    const outcome = typeof data?.outcome === 'string' ? data.outcome : '';
    return MP_CANCEL_OUTCOMES.has(outcome) ? (outcome as MpCancelOutcome) : 'error';
  } catch {
    // Red caída o timeout: no sabemos si se liberó. Se informa como 'error' (nunca se asume éxito).
    return 'error';
  }
};

/**
 * Verifica contra el backend (y éste contra MP) un pago aprobado y marca las
 * órdenes como pagadas. Respaldo del webhook para entornos sin URL pública.
 */
export const confirmMpPayment = async (paymentId: string): Promise<void> => {
  const res = await apiFetch(`${API_BASE_URL}/orders/mp-confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId }),
    signal: timeoutSignal(ORDER_ACTION_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'No se pudo confirmar el pago.');
  }
};

// ── Admin: resolución de transferencias ────────────────────────────────────────

const ADMIN_ORDER_ERROR = 'No pudimos actualizar la venta. Reintentá en unos segundos.';

const patchAdminOrder = async (orderId: string, action: string): Promise<unknown> => {
  const res = await apiFetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/${action}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    signal: timeoutSignal(ORDER_ACTION_TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
  if (!res.ok) {
    throw new Error(typeof body?.message === 'string' && body.message ? body.message : ADMIN_ORDER_ERROR);
  }
  return body;
};

/** Admin: marca pagada una transferencia pendiente (no re-descuenta stock). */
export const confirmTransferPayment = async (orderId: string): Promise<void> => {
  await patchAdminOrder(orderId, 'confirm-transfer');
};

/** Admin: cancela una transferencia pendiente y devuelve el stock. */
export const cancelTransferOrder = async (orderId: string): Promise<void> => {
  await patchAdminOrder(orderId, 'cancel-transfer');
};

/**
 * Admin: confirma una transferencia que ya había expirado (el cliente pagó tarde).
 * `oversold` = ya no había stock para volver a reservarla: hay que reembolsar o conseguirla.
 */
export const confirmLateTransferPayment = async (orderId: string): Promise<{ oversold: boolean }> => {
  const body = (await patchAdminOrder(orderId, 'confirm-late-transfer')) as { oversold?: unknown } | null;
  return { oversold: body?.oversold === true };
};
