import { useCallback, useRef, useState } from 'react';
import type { CheckoutItem } from '../../../../store/cartStore';
import { extractErrorMessage } from '../../../../utils/errorMessage';
import {
  CheckoutStockError,
  createOrder,
  createMpPreference,
  INVALID_PRODUCT_PRICE_MESSAGE,
} from '../../../../services/orderService';
import {
  buildOrderItemsPayload,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  type CheckoutTotals,
  type PaymentMethod,
  type ShippingMethod,
} from '../checkoutUtils';
import { saveMpPendingPurchase, type LastOrder } from '../mpPendingPurchase';
import { closePendingWindow, navigatePendingWindow, openPendingWindow } from '../whatsAppWindow';
import { useIdempotencyKey, useWatchdog } from './useCheckoutSafeguards';
import { usePageRestore } from './usePageRestore';

interface CheckoutPaymentInput {
  items: CheckoutItem[];
  isDirectPurchase: boolean;
  buyerName: string;
  buyerEmail: string;
  shipping: ShippingMethod;
  payment: PaymentMethod;
  totals: CheckoutTotals;
  /** Hay un motivo para no enviar (verificando stock, reserva anterior en curso, ítems inválidos). */
  submitBlocked: boolean;
  onTransferCreated: (orderIds: string[]) => void;
  /** El backend rechazó una línea por stock/talle: conviene recargar precio y stock. */
  onStockError: () => void;
}

export interface TransferCreated {
  orderIds: string[];
  whatsappUrl: string;
  /** false si el navegador bloqueó la ventana: hay que ofrecer el botón "Abrir WhatsApp". */
  windowOpened: boolean;
}

export interface CheckoutPayment {
  submitting: boolean;
  mpError: string;
  /** Error de stock de una línea concreta, vigente mientras el pedido no cambie. */
  stockError: CheckoutStockError | null;
  mpNoticeOpen: boolean;
  transferCreated: TransferCreated | null;
  closeMpNotice: () => void;
  submit: () => void;
  confirmMpRedirect: () => Promise<void>;
}

const TRANSFER_ERROR = 'No se pudo iniciar la compra. Intentá nuevamente.';
const MP_ERROR = 'No se pudo conectar con el sistema de pagos. Intentá de nuevo o elegí transferencia.';
const REDIRECT_WATCHDOG_MS = 15_000;
const REDIRECT_SLOW_MESSAGE =
  'Mercado Pago está tardando en abrir. Si no se abrió, tocá "Continuar al pago" de nuevo: tu pedido no se va a duplicar.';

const buildLastOrder = (items: CheckoutItem[], totals: CheckoutTotals, isDirect: boolean, shipping: ShippingMethod): LastOrder => ({
  items: items.map((item) => ({
    productId: String(item.product.id),
    productName: item.product.name,
    productImage: item.product.image,
    quantity: item.quantity,
    totalPrice: item.totalPrice,
  })),
  itemsSubtotal: totals.itemsSubtotal,
  grandTotal: totals.grandTotal,
  source: isDirect ? 'direct' : 'cart',
  shippingMethod: shipping,
});

/** Envío del pedido (transferencia o Mercado Pago) con idempotencia y protecciones anti doble envío. */
export const useCheckoutPayment = (input: CheckoutPaymentInput): CheckoutPayment => {
  const { items, isDirectPurchase, shipping, payment, totals, submitBlocked, onTransferCreated, onStockError } = input;
  const [submitting, setSubmitting] = useState(false);
  const [mpError, setMpError] = useState('');
  const [mpNoticeOpen, setMpNoticeOpen] = useState(false);
  const [transferCreated, setTransferCreated] = useState<TransferCreated | null>(null);
  const [stockFailure, setStockFailure] = useState<{ error: CheckoutStockError; fingerprint: string } | null>(null);
  const closeMpNotice = useCallback(() => setMpNoticeOpen(false), []);
  const idempotency = useIdempotencyKey();
  // Guard sincrónico: dos clicks en el mismo tick ven `submitting` todavía en false.
  const inFlightRef = useRef(false);
  const buyerName = input.buyerName.trim();
  const buyerEmail = input.buyerEmail.trim();
  const orderItemsPayload = buildOrderItemsPayload(items);
  const itemsFingerprint = JSON.stringify(orderItemsPayload);
  const orderBase = {
    buyerName,
    buyerEmail,
    items: orderItemsPayload,
    shippingMethod: shipping,
    shippingCost: totals.shippingCost,
    totalPrice: totals.grandTotal,
  };
  const stockError = stockFailure?.fingerprint === itemsFingerprint ? stockFailure.error : null;

  const onRedirectStalled = useCallback(() => {
    inFlightRef.current = false;
    setSubmitting(false);
    setMpError(REDIRECT_SLOW_MESSAGE);
  }, []);
  const redirectWatchdog = useWatchdog(REDIRECT_WATCHDOG_MS, onRedirectStalled);

  // Atrás desde Mercado Pago con bfcache: la página vuelve congelada en "Redirigiendo...".
  // La reserva anterior la libera useReleaseAbandonedMpPayment; el próximo intento es otro.
  usePageRestore(() => {
    if (transferCreated) return;
    inFlightRef.current = false;
    redirectWatchdog.clear();
    setSubmitting(false);
    setMpNoticeOpen(false);
    setMpError('');
    idempotency.reset();
  });

  const idempotencyKeyFor = (kind: PaymentMethod): string =>
    idempotency.get(JSON.stringify([kind, itemsFingerprint, shipping, totals.shippingCost, totals.grandTotal, buyerName, buyerEmail]));

  const reportFailure = (err: unknown, fallback: string) => {
    if (err instanceof CheckoutStockError) {
      setStockFailure({ error: err, fingerprint: itemsFingerprint });
      onStockError();
    }
    setMpError(extractErrorMessage(err, fallback));
  };

  const submitTransfer = async () => {
    // Antes de cualquier await: abrir la ventana fuera del gesto del usuario la bloquea.
    const popup = openPendingWindow();
    inFlightRef.current = true;
    setSubmitting(true);
    try {
      // La key se conserva tras el éxito: un reenvío accidental devuelve la misma venta.
      const orderIds = await createOrder({ ...orderBase, paymentMethod: 'transfer' }, idempotencyKeyFor('transfer'));
      const whatsappUrl = buildWhatsAppUrl(buildWhatsAppMessage(items, shipping, totals));
      const windowOpened = navigatePendingWindow(popup, whatsappUrl);
      setTransferCreated({ orderIds, whatsappUrl, windowOpened });
      onTransferCreated(orderIds);
    } catch (err) {
      closePendingWindow(popup);
      reportFailure(err, TRANSFER_ERROR);
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const submit = () => {
    if (inFlightRef.current || submitting || transferCreated || submitBlocked) return;
    setMpError('');
    if (!totals.hasValidPrice) {
      setMpError(INVALID_PRODUCT_PRICE_MESSAGE);
      return;
    }
    if (payment === 'mp') {
      setMpNoticeOpen(true);
      return;
    }
    void submitTransfer();
  };

  const confirmMpRedirect = async () => {
    if (inFlightRef.current || submitting) return;
    setMpNoticeOpen(false);
    // Algo cambió con el aviso abierto (p. ej. se está verificando el stock): el motivo se ve junto al CTA.
    if (submitBlocked) return;
    if (!totals.hasValidPrice) {
      setMpError(INVALID_PRODUCT_PRICE_MESSAGE);
      return;
    }
    inFlightRef.current = true;
    setSubmitting(true);
    setMpError('');
    try {
      // La key NO se descarta tras el éxito: si la redirección se traba y el usuario reintenta,
      // el backend devuelve la misma preferencia en vez de reservar stock otra vez.
      const { init_point, order_ids } = await createMpPreference(orderBase, idempotencyKeyFor('mp'));
      saveMpPendingPurchase({
        orderIds: order_ids,
        ownerEmail: buyerEmail,
        lastOrder: buildLastOrder(items, totals, isDirectPurchase, shipping),
      });
      redirectWatchdog.arm();
      window.location.assign(init_point);
    } catch (err) {
      reportFailure(err, MP_ERROR);
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return {
    submitting,
    mpError,
    stockError,
    mpNoticeOpen,
    transferCreated,
    closeMpNotice,
    submit,
    confirmMpRedirect,
  };
};
