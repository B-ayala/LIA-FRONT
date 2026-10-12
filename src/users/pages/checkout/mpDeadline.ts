export const MP_PAYMENT_WINDOW_MS = 15 * 60 * 1000;

export const EXPIRED_MP_MESSAGE =
  'Se venció el tiempo para pagar en Mercado Pago y liberamos tu reserva. Revisá tu pedido y volvé a intentar.';

/** Hora límite (es-AR, HH:MM) para pagar si el cliente confirma ahora. */
export const formatPaymentDeadline = (from: number = Date.now()): string =>
  new Date(from + MP_PAYMENT_WINDOW_MS).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
