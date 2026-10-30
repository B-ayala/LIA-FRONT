import type { ReactNode } from 'react';
import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';
import type { CancelView, ConfirmState, ResultStatus } from './hooks/useMpResultSettlement';

export type ResultTone = 'approved' | 'pending' | 'failure';

export interface ResultView {
  tone: ResultTone;
  icon: ReactNode;
  title: string;
  desc: string;
  /** Línea secundaria (estado de la liberación de la reserva, etc.). */
  note?: string;
  showBackToCheckout: boolean;
  showMyPurchases: boolean;
  showRetryRelease: boolean;
  busy: boolean;
}

const ICON_SIZE = 56;

const pickupDesc = (pickupHours: string) => `Podés retirarlo en nuestro local. Horario: ${pickupHours}.`;
const IN_PROCESS_DESC = 'Tenés un pago en proceso. No vuelvas a pagar: te avisamos en Mis compras cuando se confirme.';

const base = (tone: ResultTone, icon: ReactNode, title: string, desc: string): ResultView => ({
  tone, icon, title, desc,
  showBackToCheckout: false, showMyPurchases: false, showRetryRelease: false, busy: false,
});

const approvedView = (confirm: ConfirmState, pickupHours: string, shippingMethod?: string): ResultView => {
  if (confirm === 'confirming') {
    return { ...base('pending', <Loader2 size={ICON_SIZE} className="checkout-result-spin" />, 'Confirmando tu pago…', 'Estamos registrando tu pago. No cierres esta página.'), busy: true };
  }
  const pickup = shippingMethod === 'local' ? ` ${pickupDesc(pickupHours)}` : '';
  if (confirm === 'unverified') {
    return {
      ...base('approved', <CheckCircle size={ICON_SIZE} />, '¡Recibimos tu pago!', `Recibimos tu pago y lo estamos verificando. En unos minutos lo vas a ver en Mis compras.${pickup}`),
      showMyPurchases: true,
    };
  }
  return {
    ...base('approved', <CheckCircle size={ICON_SIZE} />, '¡Pago aprobado!', `¡Gracias por tu compra! Tu pedido y pago fueron registrados correctamente.${pickup}`),
    showMyPurchases: true,
  };
};

const FAILURE_NOTES: Partial<Record<CancelView, string>> = {
  releasing: 'Liberando tu reserva…',
  error: 'No pudimos liberar tu reserva ahora. Se libera sola en unos minutos, o podés reintentar.',
};

const failureView = (cancel: CancelView): ResultView => {
  if (cancel === 'paid') {
    return {
      ...base('approved', <CheckCircle size={ICON_SIZE} />, '¡Tu pago ya fue acreditado!', 'No tenés que volver a pagar. Podés ver el detalle en Mis compras.'),
      showMyPurchases: true,
    };
  }
  if (cancel === 'held') {
    return {
      ...base('pending', <Clock size={ICON_SIZE} />, 'Tu pago todavía se está procesando', IN_PROCESS_DESC),
      showMyPurchases: true,
    };
  }
  return {
    ...base('failure', <XCircle size={ICON_SIZE} />, 'El pago no se pudo completar', 'Hubo un problema al procesar el pago. Podés intentarlo de nuevo o elegir transferencia bancaria.'),
    note: FAILURE_NOTES[cancel],
    showBackToCheckout: cancel !== 'releasing',
    showRetryRelease: cancel === 'error',
    busy: cancel === 'releasing',
  };
};

interface ResolveInput {
  status: ResultStatus;
  confirm: ConfirmState;
  cancel: CancelView;
  shippingMethod?: string;
  /** Horario de retiro que publica el admin (Config. del sitio → Entrega). */
  pickupHours: string;
}

/** Qué mostrar en /checkout/result según lo que dijo MP en la URL y lo que respondió el backend. */
export const resolveResultView = ({ status, confirm, cancel, shippingMethod, pickupHours }: ResolveInput): ResultView => {
  if (status === 'approved') return approvedView(confirm, pickupHours, shippingMethod);
  if (status === 'failure') return failureView(cancel);
  if (status === 'pending') {
    return { ...base('pending', <Clock size={ICON_SIZE} />, 'Pago en proceso', IN_PROCESS_DESC), showMyPurchases: true };
  }
  return base('pending', <Clock size={ICON_SIZE} />, 'Estado desconocido', 'No pudimos determinar el estado del pago. Revisá Mis compras o tu cuenta de Mercado Pago.');
};
