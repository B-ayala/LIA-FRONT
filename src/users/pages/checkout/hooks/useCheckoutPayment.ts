import { useCallback, useRef, useState } from 'react';
import type { CheckoutItem } from '../../../../store/cartStore';
import { extractErrorMessage } from '../../../../utils/errorMessage';
import { createOrder, createMpPreference, INVALID_PRODUCT_PRICE_MESSAGE } from '../../../../services/orderService';
import {
  buildOrderItemsPayload,
  buildWhatsAppMessage,
  WHATSAPP_PHONE,
  type CheckoutTotals,
  type PaymentMethod,
  type ShippingMethod,
} from '../checkoutUtils';

interface CheckoutPaymentInput {
  items: CheckoutItem[];
  isDirectPurchase: boolean;
  buyerName: string;
  buyerEmail: string;
  shipping: ShippingMethod;
  payment: PaymentMethod;
  totals: CheckoutTotals;
  onTransferCreated: (orderIds: string[]) => void;
}

interface CheckoutPayment {
  submitting: boolean;
  mpError: string;
  mpNoticeOpen: boolean;
  closeMpNotice: () => void;
  submit: () => Promise<void>;
  confirmMpRedirect: () => Promise<void>;
}

const TRANSFER_ERROR = 'No se pudo iniciar la compra. Intentá nuevamente.';
const MP_ERROR = 'No se pudo conectar con el sistema de pagos. Intentá de nuevo o elegí transferencia.';

/** Envío del pedido (transferencia o Mercado Pago). Misma lógica, payloads e idempotencia que antes del rediseño. */
export const useCheckoutPayment = (input: CheckoutPaymentInput): CheckoutPayment => {
  const { items, isDirectPurchase, shipping, payment, totals, onTransferCreated } = input;
  const [submitting, setSubmitting] = useState(false);
  const [mpError, setMpError] = useState('');
  const [mpNoticeOpen, setMpNoticeOpen] = useState(false);
  const closeMpNotice = useCallback(() => setMpNoticeOpen(false), []);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const buyerName = input.buyerName.trim();
  const buyerEmail = input.buyerEmail.trim();
  const orderItemsPayload = buildOrderItemsPayload(items);
  const orderBase = {
    buyerName,
    buyerEmail,
    items: orderItemsPayload,
    shippingMethod: shipping,
    shippingCost: totals.shippingCost,
    totalPrice: totals.grandTotal,
  };

  // Una key por intento de compra: los reintentos (timeout, 503, doble click) con el mismo
  // carrito la reutilizan; si cambia el contenido se genera otra. Se descarta tras el éxito.
  const getIdempotencyKey = (kind: PaymentMethod): string => {
    const fingerprint = JSON.stringify([kind, orderItemsPayload, shipping, totals.shippingCost, totals.grandTotal, buyerName, buyerEmail]);
    if (idempotencyRef.current?.fingerprint !== fingerprint) {
      idempotencyRef.current = { fingerprint, key: crypto.randomUUID() };
    }
    return idempotencyRef.current.key;
  };

  const submitTransfer = async () => {
    setSubmitting(true);
    try {
      const orderIds = await createOrder({ ...orderBase, paymentMethod: 'transfer' }, getIdempotencyKey('transfer'));
      idempotencyRef.current = null;
      const message = buildWhatsAppMessage(items, shipping, totals);
      window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
      onTransferCreated(orderIds);
    } catch (err) {
      setMpError(extractErrorMessage(err, TRANSFER_ERROR));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (submitting) return;
    setMpError('');

    if (!totals.hasValidPrice) {
      setMpError(INVALID_PRODUCT_PRICE_MESSAGE);
      return;
    }

    if (payment === 'mp') {
      // Aviso de 15 minutos antes de redirigir a Mercado Pago.
      setMpNoticeOpen(true);
      return;
    }

    await submitTransfer();
  };

  const saveLastOrderForResult = (orderIds: string[]) => {
    sessionStorage.setItem('mp_last_order', JSON.stringify({
      items: items.map((item) => ({
        productName: item.product.name,
        productImage: item.product.image,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
      })),
      itemsSubtotal: totals.itemsSubtotal,
      grandTotal: totals.grandTotal,
      source: isDirectPurchase ? 'direct' : 'cart',
      shippingMethod: shipping,
    }));
    sessionStorage.setItem('mp_order_ids', JSON.stringify(orderIds));
  };

  const confirmMpRedirect = async () => {
    if (submitting) return;
    if (!totals.hasValidPrice) {
      setMpError(INVALID_PRODUCT_PRICE_MESSAGE);
      setMpNoticeOpen(false);
      return;
    }

    setSubmitting(true);
    setMpNoticeOpen(false);
    try {
      const { init_point, order_ids } = await createMpPreference(orderBase, getIdempotencyKey('mp'));
      idempotencyRef.current = null;
      saveLastOrderForResult(order_ids);
      window.location.href = init_point;
    } catch (err) {
      setMpError(extractErrorMessage(err, MP_ERROR));
      setSubmitting(false);
    }
  };

  return {
    submitting,
    mpError,
    mpNoticeOpen,
    closeMpNotice,
    submit,
    confirmMpRedirect,
  };
};
