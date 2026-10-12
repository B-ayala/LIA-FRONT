import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import './CheckoutNotice.css';

export type NoticeTone = 'info' | 'progress' | 'warning' | 'danger' | 'success';

const ICONS: Record<NoticeTone, typeof Info> = {
  info: Info,
  progress: Loader2,
  warning: AlertTriangle,
  danger: XCircle,
  success: CheckCircle2,
};

interface CheckoutNoticeProps {
  tone: NoticeTone;
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
  /** `alert` interrumpe al lector de pantalla (errores); `status` lo anuncia sin interrumpir. */
  role?: 'alert' | 'status';
}

/** Aviso del checkout (reserva anterior, stock, pedido creado). Colores desde tokens. */
const CheckoutNotice = ({ tone, title, children, actions, role = 'status' }: CheckoutNoticeProps) => {
  const Icon = ICONS[tone];
  return (
    <div className={`checkout-notice checkout-notice--${tone}`} role={role}>
      <Icon size={20} aria-hidden="true" className="checkout-notice__icon" />
      <div className="checkout-notice__body">
        {title && <p className="checkout-notice__title">{title}</p>}
        {children && <div className="checkout-notice__text">{children}</div>}
        {actions && <div className="checkout-notice__actions">{actions}</div>}
      </div>
    </div>
  );
};

export default CheckoutNotice;
