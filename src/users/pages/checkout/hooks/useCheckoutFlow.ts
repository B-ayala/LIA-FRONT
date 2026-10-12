import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCartStore } from '../../../../store/cartStore';
import type { CheckoutItem } from '../../../../store/cartStore';
import type { AuthUser } from '../../../../store/authStore';
import {
  DEFAULT_PAYMENT,
  DEFAULT_SHIPPING,
  computeCheckoutTotals,
  getCheckoutBlockReason,
  parseReturnShipping,
  type PaymentMethod,
  type ShippingMethod,
} from '../checkoutUtils';
import { useCheckoutStep } from './useCheckoutStep';
import { useCheckoutPayment } from './useCheckoutPayment';
import { useTransferNudge } from './useTransferNudge';

/** Orquesta el estado del checkout (datos, entrega, pago, paso y nudge) para el container. */
export const useCheckoutFlow = (user: AuthUser, items: CheckoutItem[], isDirectPurchase: boolean) => {
  const clearCart = useCartStore((s) => s.clearCart);
  const [nameDraft, setNameDraft] = useState('');
  const location = useLocation();
  const [shipping, setShipping] = useState<ShippingMethod>(
    () => parseReturnShipping(location.state) ?? DEFAULT_SHIPPING
  );
  const [payment, setPayment] = useState<PaymentMethod>(DEFAULT_PAYMENT);
  const sessionName = user.name.trim();
  // Nombre y e-mail salen de la sesión: el e-mail es la clave de propiedad de la venta
  // (Mis compras, cancelación MP y nudge comparan buyer_email con el usuario logueado).
  const buyerName = sessionName || nameDraft;
  const buyerEmail = user.email;
  const totals = computeCheckoutTotals(items, shipping);
  const blockReason = getCheckoutBlockReason(totals, buyerName, buyerEmail);
  const stepper = useCheckoutStep(blockReason === null);
  const nudge = useTransferNudge(clearCart);
  const pay = useCheckoutPayment({
    items, isDirectPurchase, buyerName, buyerEmail, shipping, payment, totals,
    onTransferCreated: (orderIds) => (orderIds.length > 0 ? nudge.armNudge(orderIds) : clearCart()),
  });

  return {
    items, totals, blockReason, stepper, nudge, pay,
    buyer: { name: buyerName, email: buyerEmail, needsName: sessionName === '', setName: setNameDraft },
    shipping, setShipping, payment, setPayment,
  };
};

export type CheckoutFlowState = ReturnType<typeof useCheckoutFlow>;
