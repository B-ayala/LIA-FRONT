import { useEffect, useRef } from 'react';
import { Hourglass } from 'lucide-react';
import PrimaryPillButton from './PrimaryPillButton';
import './MpRedirectNotice.css';

interface MpRedirectNoticeProps {
  open: boolean;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const TITLE_ID = 'mp-notice-title';

/** Aviso de 15 minutos antes de redirigir a Mercado Pago (mismo texto y acciones que antes del rediseño). */
const MpRedirectNotice = ({ open, submitting, onConfirm, onClose }: MpRedirectNoticeProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mp-notice__overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="mp-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onClick={(event) => event.stopPropagation()}
      >
        <Hourglass size={44} aria-hidden="true" className="mp-notice__icon" />
        <h3 id={TITLE_ID} className="mp-notice__title">Estás a un paso de finalizar tu compra</h3>
        <p className="mp-notice__desc">
          Tenés <strong>15 minutos</strong> para completar el pago en Mercado Pago. Si no se acredita en ese tiempo, la orden se cancelará automáticamente y el producto volverá a estar disponible.
        </p>
        <div className="mp-notice__actions">
          <PrimaryPillButton onClick={onConfirm} disabled={submitting}>Ir a Mercado Pago</PrimaryPillButton>
          <PrimaryPillButton variant="secondary" onClick={onClose}>Volver</PrimaryPillButton>
        </div>
      </div>
    </div>
  );
};

export default MpRedirectNotice;
