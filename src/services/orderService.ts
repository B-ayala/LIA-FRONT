import { supabase } from '../config/supabaseClient';
import { apiFetch, API_BASE_URL } from '../utils/apiFetch';
import type { UnitVariants } from '../store/cartStore';

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
  shippingCost?: number | null;
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

/** Inserta una venta directamente en Supabase (usado para transferencia bancaria). */
export const createOrder = async (payload: CreateOrderPayload): Promise<void> => {
  const validationError = validateOrderPayload(payload);
  if (validationError) {
    throw new Error(validationError);
  }

  const shippingSurcharge = Number.isFinite(payload.shippingCost) ? Number(payload.shippingCost) : 0;

  const { error } = await supabase.from('ventas').insert(
    payload.items.map((item, index) => ({
      buyer_name: payload.buyerName || null,
      buyer_email: payload.buyerEmail || null,
      product_id: item.productId ? Number(item.productId) : null,
      product_name: item.productName,
      product_image: item.productImage,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice + (index === 0 ? shippingSurcharge : 0),
      units_config: item.unitsConfig,
      payment_method: payload.paymentMethod,
      payment_status: 'pendiente',
      shipping_method: payload.shippingMethod ?? null,
    }))
  );

  // Supabase no lanza: devuelve { error }. Antes este fallo era invisible y la
  // venta se perdía sin que nadie se enterara; el flujo de pago igual continúa.
  if (error) {
    console.error('createOrder: no se pudo registrar la venta:', error.message);
  }
};

export interface MpPreferenceResult {
  init_point: string;
  order_ids: string[];
}

/** Llama al backend para crear una preferencia de Mercado Pago y registrar la venta. */
export const createMpPreference = async (
  payload: Omit<CreateOrderPayload, 'paymentMethod'>
): Promise<MpPreferenceResult> => {
  const validationError = validateOrderPayload({ ...payload, paymentMethod: 'mp' });
  if (validationError) {
    throw new Error(validationError);
  }

  const res = await apiFetch(`${API_BASE_URL}/orders/mp-preference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyerName: payload.buyerName,
      buyerEmail: payload.buyerEmail,
      items: payload.items,
      shippingMethod: payload.shippingMethod,
      shippingCost: payload.shippingCost,
      totalPrice: payload.totalPrice,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(normalizeOrderErrorMessage((err as { message?: string }).message));
  }

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

/** Obtiene las compras pagadas del usuario por email. Usa el backend para bypassear RLS de Supabase. */
export const getUserPurchases = async (email: string): Promise<Purchase[]> => {
  const res = await apiFetch(`${API_BASE_URL}/orders/user?email=${encodeURIComponent(email)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Error al cargar tus compras.');
  }
  const data = await res.json();
  return (data.orders ?? []) as Purchase[];
};

/** Cancela una orden MP pendiente (usuario volvió sin pagar). Restaura stock en el backend. */
export const cancelMpOrder = async (orderId: string): Promise<void> => {
  await apiFetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' })
    .catch((err: unknown) => {
      // No bloquea la UX: el sweep de expiración del backend lo limpia igual,
      // pero el fallo queda registrado para poder diagnosticarlo.
      console.error('cancelMpOrder: fallo al cancelar la orden', orderId, err);
    });
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
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'No se pudo confirmar el pago.');
  }
};
