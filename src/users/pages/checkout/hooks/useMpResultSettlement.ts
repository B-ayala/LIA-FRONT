import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../../../store/authStore';
import { cancelMpOrders, confirmMpPayment, type MpCancelOutcome } from '../../../../services/orderService';
import {
  forgetMpPendingPurchase,
  isPurchaseOwnedBy,
  readLastOrder,
  readPendingMpPurchase,
  readPendingOrderIds,
  type LastOrder,
  type PendingMpPurchase,
} from '../mpPendingPurchase';
import { applyMpCancelOutcome, RELEASE_UI_TIMEOUT_MS, settlePurchasedCart } from '../mpSettlement';

export type ResultStatus = 'approved' | 'pending' | 'failure' | 'unknown';
/** confirming = corre mp-confirm; unverified = falló o no hay payment_id (lo resuelve el webhook). */
export type ConfirmState = 'idle' | 'confirming' | 'confirmed' | 'unverified';
/** skipped = no se intenta liberar (sin sesión o la compra es de otra cuenta). */
export type CancelView = 'idle' | 'releasing' | MpCancelOutcome | 'skipped';

interface MpResultParams {
  status: ResultStatus;
  paymentId: string;
  externalRef: string;
}

export interface MpResultSettlement {
  lastOrder: LastOrder | null;
  confirm: ConfirmState;
  cancel: CancelView;
  retryCancel: () => void;
}

const isUsablePaymentId = (paymentId: string): boolean => paymentId !== '' && paymentId !== 'null';

const parseExternalRef = (externalRef: string): string[] =>
  externalRef.split(',').map((id) => id.trim()).filter(Boolean);

const initialConfirm = (status: ResultStatus, paymentId: string): ConfirmState => {
  if (status !== 'approved') return 'idle';
  return isUsablePaymentId(paymentId) ? 'confirming' : 'unverified';
};

const ownsPendingPurchase = (pending: PendingMpPurchase | null, email: string): boolean =>
  email !== '' && (!pending || isPurchaseOwnedBy(pending, email));

/** Registra el pago aprobado en el backend (verificado contra MP, no contra la URL). */
const useConfirmPayment = (initial: ConfirmState, paymentId: string): ConfirmState => {
  const [confirm, setConfirm] = useState<ConfirmState>(initial);

  useEffect(() => {
    if (confirm !== 'confirming') return undefined;
    let active = true;
    confirmMpPayment(paymentId).then(
      () => { if (active) setConfirm('confirmed'); },
      // Si falla, el webhook o el reintento de MP lo terminan acreditando: se informa como
      // "lo estamos verificando", nunca como registrado.
      () => { if (active) setConfirm('unverified'); },
    );
    return () => {
      active = false;
    };
  }, [confirm, paymentId]);

  return confirm;
};

/**
 * Lógica de /checkout/result: confirmar el pago aprobado, sacar del carrito SOLO lo comprado
 * (aprobado o en proceso) y, si falló, pedir liberar la reserva esperando lo que dice el backend.
 * Nada depende de la URL para tocar el carrito: sin detalle guardado de la compra no se toca.
 */
export const useMpResultSettlement = ({ status, paymentId, externalRef }: MpResultParams): MpResultSettlement => {
  const userEmail = useAuthStore((s) => s.currentUser?.email ?? '');
  const authInitialized = useAuthStore((s) => s.authInitialized);
  const [pending] = useState(() => readPendingMpPurchase());
  const [lastOrder] = useState(() => readLastOrder());
  const [orderIds] = useState(() => {
    const fromUrl = parseExternalRef(externalRef);
    return fromUrl.length > 0 ? fromUrl : readPendingOrderIds();
  });
  const confirm = useConfirmPayment(initialConfirm(status, paymentId), paymentId);
  const [cancel, setCancel] = useState(() => ({
    state: (status === 'failure' && orderIds.length > 0 ? 'releasing' : 'idle') as CancelView,
    attempt: 0,
  }));
  const settledRef = useRef(false);
  const owner = ownsPendingPurchase(pending, userEmail);

  // Aprobado o en proceso: lo comprado sale del carrito (una sola vez, recién con la sesión).
  useEffect(() => {
    if (settledRef.current || !owner || (status !== 'approved' && status !== 'pending')) return;
    settledRef.current = true;
    settlePurchasedCart(lastOrder);
    forgetMpPendingPurchase();
  }, [owner, status, lastOrder]);

  useEffect(() => {
    if (cancel.state !== 'releasing' || !owner) return undefined;
    let active = true;
    const finish = (state: CancelView) => {
      if (!active) return;
      active = false;
      setCancel((current) => ({ ...current, state }));
    };
    const timer = window.setTimeout(() => finish('error'), RELEASE_UI_TIMEOUT_MS);
    void cancelMpOrders(orderIds).then((outcome) => {
      window.clearTimeout(timer);
      if (!active) return;
      applyMpCancelOutcome(outcome, lastOrder);
      finish(outcome);
    });
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [cancel.state, cancel.attempt, owner, orderIds, lastOrder]);

  const retryCancel = useCallback(() => {
    setCancel((current) => ({ state: 'releasing', attempt: current.attempt + 1 }));
  }, []);

  // Sin sesión (o con otra cuenta) no se puede liberar: lo hace el vencimiento del backend.
  const cannotRelease = (authInitialized && userEmail === '') || (userEmail !== '' && !owner);
  const cancelView: CancelView = cancel.state === 'releasing' && cannotRelease ? 'skipped' : cancel.state;

  return { lastOrder, confirm, cancel: cancelView, retryCancel };
};
