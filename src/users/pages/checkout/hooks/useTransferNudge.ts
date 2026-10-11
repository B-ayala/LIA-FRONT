import { useCallback, useEffect, useRef, useState } from 'react';
import { recordNudge } from '../../../../services/orderService';
import type { NudgeResponse } from '../../../../services/orderService';

interface TransferNudge {
  nudgeOpen: boolean;
  nudgeBusy: boolean;
  nudgeError: string | null;
  armNudge: (orderIds: string[]) => void;
  respond: (response: NudgeResponse) => Promise<void>;
  finish: () => void;
}

/**
 * Nudge "¿al final comprás?" tras abrir WhatsApp en la compra por transferencia.
 * Se dispara cuando el usuario vuelve a la pestaña; al cerrarlo se vacía el carrito
 * (la venta ya está creada) y eso redirige a /products desde el checkout.
 */
export const useTransferNudge = (clearCart: () => void): TransferNudge => {
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const [nudgeError, setNudgeError] = useState<string | null>(null);
  const orderIdsRef = useRef<string[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  // El listener de "volvió de WhatsApp" se arma imperativamente; lo limpiamos si
  // el usuario abandona el checkout sin volver, para no dejar listeners colgados.
  useEffect(() => () => cleanupRef.current?.(), []);

  const armNudge = useCallback((orderIds: string[]) => {
    orderIdsRef.current = orderIds;
    cleanupRef.current?.();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        cleanup();
        setNudgeOpen(true);
      }
    };
    const cleanup = () => {
      document.removeEventListener('visibilitychange', onVisible);
      cleanupRef.current = null;
    };
    document.addEventListener('visibilitychange', onVisible);
    cleanupRef.current = cleanup;
  }, []);

  const finish = useCallback(() => {
    setNudgeOpen(false);
    setNudgeBusy(false);
    setNudgeError(null);
    orderIdsRef.current = [];
    clearCart();
  }, [clearCart]);

  const respond = useCallback(async (response: NudgeResponse) => {
    setNudgeBusy(true);
    setNudgeError(null);
    try {
      await recordNudge(orderIdsRef.current, response);
      finish();
    } catch {
      setNudgeBusy(false);
      setNudgeError('No pudimos registrar tu respuesta, pero tu pedido quedó guardado.');
    }
  }, [finish]);

  return { nudgeOpen, nudgeBusy, nudgeError, armNudge, respond, finish };
};
