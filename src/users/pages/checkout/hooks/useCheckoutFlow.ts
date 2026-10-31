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
import { useCheckoutTerms } from './useCheckoutTerms';
import { useTransferNudge } from './useTransferNudge';
import { useCartFreshness, type CartFreshness } from './useCartFreshness';
import type { ReleaseStatus } from './useReleaseAbandonedMpPayment';

const VERIFYING_MESSAGE = 'Estamos verificando el precio y el stock de tu pedido…';
const INVALID_ITEMS_MESSAGE = 'Revisá los productos marcados en tu pedido antes de pagar.';
const RELEASING_MESSAGE = 'Liberando tu reserva anterior…';
const HELD_MESSAGE = 'Tu pago anterior todavía se está procesando. No vuelvas a pagar.';

/** Motivo por el que no se puede enviar el pago ahora (además de los datos del comprador). */
const getSubmitLockReason = (freshness: CartFreshness, release: ReleaseStatus): string | null => {
  if (release === 'releasing') return RELEASING_MESSAGE;
  if (release === 'held') return HELD_MESSAGE;
  if (freshness.status === 'loading') return VERIFYING_MESSAGE;
  if (Object.keys(freshness.issues).length > 0) return INVALID_ITEMS_MESSAGE;
  return null;
};

/** Orquesta el estado del checkout (datos, entrega, pago, paso, stock fresco y nudge) para el container. */
export const useCheckoutFlow = (user: AuthUser, items: CheckoutItem[], isDirectPurchase: boolean, releaseStatus: ReleaseStatus) => {
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
  const totals = computeCheckoutTotals(items, shipping, payment);
  // Solo datos del comprador/precio: decide si se puede ENTRAR al paso Pago (no rebota la URL
  // mientras se verifica el stock).
  const blockReason = getCheckoutBlockReason(totals, buyerName, buyerEmail);
  const freshness = useCartFreshness(items);
  const terms = useCheckoutTerms();
  const submitLockReason = getSubmitLockReason(freshness, releaseStatus) ?? terms.lockReason;
  const stepper = useCheckoutStep(blockReason === null);
  const nudge = useTransferNudge(clearCart);
  const pay = useCheckoutPayment({
    items, isDirectPurchase, buyerName, buyerEmail, shipping, payment, totals,
    submitBlocked: blockReason !== null || submitLockReason !== null,
    onTransferCreated: nudge.armNudge,
    onStockError: freshness.refresh,
    ensureTermsAccepted: terms.ensureAccepted,
  });

  return {
    items, totals, blockReason, submitLockReason, freshness, stepper, nudge, pay, isDirectPurchase, terms,
    buyer: { name: buyerName, email: buyerEmail, needsName: sessionName === '', setName: setNameDraft },
    shipping, setShipping, payment, setPayment,
  };
};

export type CheckoutFlowState = ReturnType<typeof useCheckoutFlow>;
