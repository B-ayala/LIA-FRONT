import { useCallback, useRef, useState } from 'react';
import {
  cancelTransferOrder,
  confirmLateTransferPayment,
  confirmTransferPayment,
} from '../../../services/orderService';
import { extractErrorMessage } from '../../../utils/errorMessage';
import type { Sale } from './salesQueries';

export type SaleAction = 'confirm' | 'cancel' | 'late';

export interface SaleFeedback {
  status: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface ActionConfig {
  prompt: string;
  confirmLabel: string;
  busyLabel: string;
  danger: boolean;
  errorTitle: string;
  run: (orderId: string) => Promise<SaleFeedback>;
}

export const SALE_ACTIONS: Record<SaleAction, ActionConfig> = {
  confirm: {
    prompt: '¿Confirmás el pago? Una vez realizada, no se podrá deshacer.',
    confirmLabel: 'Confirmar pago',
    busyLabel: 'Confirmando...',
    danger: false,
    errorTitle: 'No se pudo confirmar el pago',
    run: async (orderId) => {
      await confirmTransferPayment(orderId);
      return { status: 'success', title: 'Pago confirmado', message: 'La venta quedó como pagada.' };
    },
  },
  cancel: {
    prompt: '¿Cancelar esta orden de transferencia? Esta acción no se puede deshacer.',
    confirmLabel: 'Cancelar orden',
    busyLabel: 'Cancelando...',
    danger: true,
    errorTitle: 'No se pudo cancelar la orden',
    run: async (orderId) => {
      await cancelTransferOrder(orderId);
      return { status: 'success', title: 'Orden cancelada', message: 'La orden se canceló y el stock volvió a estar disponible.' };
    },
  },
  late: {
    prompt: '¿Confirmás el pago tardío de esta transferencia vencida? Se vuelve a reservar el stock y no se puede deshacer.',
    confirmLabel: 'Confirmar pago tardío',
    busyLabel: 'Confirmando...',
    danger: false,
    errorTitle: 'No se pudo confirmar el pago tardío',
    run: async (orderId) => {
      const { oversold } = await confirmLateTransferPayment(orderId);
      return oversold
        ? { status: 'info', title: 'Pago confirmado sin stock', message: 'Se confirmó, pero ya no había stock: reembolsá o conseguí la mercadería.' }
        : { status: 'success', title: 'Pago confirmado', message: 'La venta quedó como pagada y el stock se volvió a reservar.' };
    },
  },
};

interface PendingSaleAction {
  sale: Sale;
  action: SaleAction;
}

/** Acciones del admin sobre ventas: confirmación previa, anti doble click y resultado visible. */
export const useSaleActions = (onDone: () => void) => {
  const [pending, setPending] = useState<PendingSaleAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<SaleFeedback | null>(null);
  const busyRef = useRef(false);

  const request = useCallback((sale: Sale, action: SaleAction) => setPending({ sale, action }), []);
  const dismiss = useCallback(() => {
    if (!busyRef.current) setPending(null);
  }, []);
  const clearFeedback = useCallback(() => setFeedback(null), []);

  const run = async () => {
    if (!pending || busyRef.current) return;
    const config = SALE_ACTIONS[pending.action];
    busyRef.current = true;
    setBusy(true);
    try {
      setFeedback(await config.run(pending.sale.id));
      onDone();
    } catch (err) {
      setFeedback({ status: 'error', title: config.errorTitle, message: extractErrorMessage(err, 'Reintentá en unos segundos.') });
    } finally {
      busyRef.current = false;
      setBusy(false);
      setPending(null);
    }
  };

  return { pending, busy, feedback, request, dismiss, run, clearFeedback };
};
