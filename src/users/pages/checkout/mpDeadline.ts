export const MP_PAYMENT_WINDOW_MS = 15 * 60 * 1000;

const DEADLINE_KEY = 'mp_deadline';
const ORDER_IDS_KEY = 'mp_order_ids';

export const EXPIRED_MP_MESSAGE =
  'Se venció el tiempo para pagar en Mercado Pago y liberamos tu reserva. Revisá tu pedido y volvé a intentar.';

export interface AbandonedMpPayment {
  orderIds: string[];
  expired: boolean;
}

/** Hora límite (es-AR, HH:MM) para pagar si el cliente confirma ahora. */
export const formatPaymentDeadline = (from: number = Date.now()): string =>
  new Date(from + MP_PAYMENT_WINDOW_MS).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

/** Guarda el límite de pago para detectar la compra abandonada si el usuario vuelve sin pasar por el resultado. */
export const saveMpDeadline = (from: number = Date.now()): void => {
  sessionStorage.setItem(DEADLINE_KEY, String(from + MP_PAYMENT_WINDOW_MS));
};

/** /checkout/result ya resuelve la compra: sin límite guardado, no hay nada abandonado que cancelar. */
export const clearMpDeadline = (): void => {
  sessionStorage.removeItem(DEADLINE_KEY);
};

const parseOrderIds = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

/** Lectura sin efectos: la compra de Mercado Pago que quedó sin resolver, o null si no hay. */
export const peekAbandonedMpPayment = (now: number = Date.now()): AbandonedMpPayment | null => {
  const deadline = Number(sessionStorage.getItem(DEADLINE_KEY));
  const orderIds = parseOrderIds(sessionStorage.getItem(ORDER_IDS_KEY));
  if (orderIds.length === 0 || !Number.isFinite(deadline) || deadline === 0) return null;
  return { orderIds, expired: deadline <= now };
};

/** Olvida la compra sin resolver (se llama una vez que ya se la canceló). */
export const forgetAbandonedMpPayment = (): void => {
  sessionStorage.removeItem(DEADLINE_KEY);
  sessionStorage.removeItem(ORDER_IDS_KEY);
};
