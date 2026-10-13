import type { IconType } from 'react-icons';
import { FiClock, FiXCircle } from 'react-icons/fi';
import DispatchTracker from './DispatchTracker';

interface PaymentStatusNoticeProps {
  paymentStatus: string;
  dispatchStatus: string | null;
  shippingMethod: string | null;
}

interface NoticeContent {
  title: string;
  hint: string;
  icon: IconType;
  tone: 'waiting' | 'closed';
}

const NOTICE_BY_PAYMENT_STATUS: Record<string, NoticeContent> = {
  pendiente: {
    title: 'Verificando tu comprobante',
    hint: 'Recibimos tu aviso de pago. Estamos revisando tu transferencia; cuando la confirmemos vas a ver acá el seguimiento de tu pedido.',
    icon: FiClock,
    tone: 'waiting',
  },
  cancelado: {
    title: 'Pedido cancelado',
    hint: 'No pudimos confirmar el pago y el pedido fue cancelado. Si ya transferiste, escribinos por WhatsApp y lo resolvemos.',
    icon: FiXCircle,
    tone: 'closed',
  },
  expirado: {
    title: 'Reserva vencida',
    hint: 'No recibimos la confirmación del pago a tiempo y liberamos tu reserva. Si ya transferiste, escribinos por WhatsApp y lo resolvemos.',
    icon: FiXCircle,
    tone: 'closed',
  },
};

const TONE_STYLE = {
  waiting: { background: 'rgba(245,158,11,0.12)', color: '#92400e' },
  closed: { background: 'rgba(220,38,38,0.08)', color: '#991b1b' },
} as const;

/** Mientras el pago no esté acreditado no hay despacho que seguir: se muestra el estado del pago. */
const PaymentStatusNotice = ({ paymentStatus, dispatchStatus, shippingMethod }: PaymentStatusNoticeProps) => {
  const notice = NOTICE_BY_PAYMENT_STATUS[paymentStatus];
  if (!notice) return <DispatchTracker status={dispatchStatus} shippingMethod={shippingMethod} />;

  const Icon = notice.icon;
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
        padding: '0.85rem 1rem',
        ...TONE_STYLE[notice.tone],
      }}
    >
      <Icon size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
      <div>
        <p style={{ margin: '0 0 0.2rem', fontWeight: 600, fontSize: '0.9rem' }}>{notice.title}</p>
        <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5 }}>{notice.hint}</p>
      </div>
    </div>
  );
};

export default PaymentStatusNotice;
