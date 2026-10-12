import { useCallback, useEffect, useState } from 'react';
import { cancelMpOrders, type MpCancelOutcome } from '../../../../services/orderService';
import { isPurchaseOwnedBy, readPendingMpPurchase, type PendingMpPurchase } from '../mpPendingPurchase';
import { applyMpCancelOutcome, RELEASE_UI_TIMEOUT_MS } from '../mpSettlement';
import { usePageRestore } from './usePageRestore';

export type ReleaseStatus = 'idle' | 'releasing' | 'released' | 'held' | 'paid' | 'error';

interface ReleaseState {
  status: ReleaseStatus;
  /** true solo si la reserva se liberó Y el plazo de 15 minutos ya había vencido. */
  expired: boolean;
  purchase: PendingMpPurchase | null;
  attempt: number;
}

export interface AbandonedMpRelease {
  status: ReleaseStatus;
  expired: boolean;
  /** Reintenta la consulta (tras un error o para ver si un pago "en proceso" ya se resolvió). */
  retry: () => void;
}

const pendingFor = (email: string): PendingMpPurchase | null => {
  const purchase = readPendingMpPurchase();
  // Otra cuenta en la misma pestaña: no liberamos ni olvidamos una compra ajena.
  return purchase && isPurchaseOwnedBy(purchase, email) ? purchase : null;
};

const startState = (purchase: PendingMpPurchase | null, attempt: number): ReleaseState => ({
  status: purchase ? 'releasing' : 'idle',
  expired: false,
  purchase,
  attempt,
});

/** Estado a mostrar según el backend; el banner de plazo vencido solo si de verdad se liberó. */
const settleOutcome = (outcome: MpCancelOutcome, purchase: PendingMpPurchase): Pick<ReleaseState, 'status' | 'expired'> => {
  applyMpCancelOutcome(outcome, purchase.lastOrder);
  return { status: outcome, expired: outcome === 'released' && purchase.expired };
};

/**
 * Si el usuario volvió de Mercado Pago sin pasar por el resultado (Atrás, pestaña recargada),
 * pide al backend liberar esa reserva y ESPERA la respuesta antes de dejarlo pagar de nuevo:
 * con un pago todavía en curso, reintentar podía terminar en un cobro doble.
 */
export const useReleaseAbandonedMpPayment = (userEmail: string): AbandonedMpRelease => {
  const [state, setState] = useState<ReleaseState>(() => startState(pendingFor(userEmail), 0));
  const { status, purchase, attempt } = state;

  useEffect(() => {
    if (status !== 'releasing' || !purchase) return undefined;
    let active = true;
    const finish = (next: Pick<ReleaseState, 'status' | 'expired'>) => {
      if (!active) return;
      active = false;
      setState((current) => ({ ...current, ...next }));
    };
    const timer = window.setTimeout(() => finish({ status: 'error', expired: false }), RELEASE_UI_TIMEOUT_MS);
    void cancelMpOrders(purchase.orderIds).then((outcome) => {
      window.clearTimeout(timer);
      if (active) finish(settleOutcome(outcome, purchase));
    });
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [status, purchase, attempt]);

  const retry = useCallback(() => {
    setState((current) => startState(pendingFor(userEmail), current.attempt + 1));
  }, [userEmail]);

  // Atrás desde Mercado Pago con bfcache: no hay remount, se vuelve a consultar a mano.
  usePageRestore(retry);

  return { status, expired: state.expired, retry };
};
