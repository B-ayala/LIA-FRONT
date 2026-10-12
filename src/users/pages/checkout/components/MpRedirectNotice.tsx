import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Hourglass } from 'lucide-react';
import PrimaryPillButton from './PrimaryPillButton';
import { formatPaymentDeadline } from '../mpDeadline';
import './MpRedirectNotice.css';

interface MpRedirectNoticeProps {
  open: boolean;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const TITLE_ID = 'mp-notice-title';
const DESC_ID = 'mp-notice-desc';
const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** Mantiene el Tab dentro del diálogo (aria-modal no lo hace solo). */
const trapTab = (event: KeyboardEvent, dialog: HTMLElement | null) => {
  if (!dialog) return;
  const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
};

const useDialogFocus = (open: boolean, onClose: () => void, dialogRef: RefObject<HTMLDivElement | null>, initialRef: RefObject<HTMLButtonElement | null>) => {
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Foco inicial en la acción segura: un Enter apurado no debe mandar a pagar.
    initialRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'Tab') trapTab(event, dialogRef.current);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose, dialogRef, initialRef]);
};

/** Aviso de 15 minutos antes de redirigir a Mercado Pago. */
const MpRedirectNotice = ({ open, submitting, onConfirm, onClose }: MpRedirectNoticeProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  // Se fija al abrir: el límite real lo pone el backend un instante después, así que esta hora es conservadora.
  const deadline = useMemo(() => (open ? formatPaymentDeadline() : ''), [open]);
  useDialogFocus(open, onClose, dialogRef, backRef);

  if (!open) return null;

  return (
    <div className="mp-notice__overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="mp-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={DESC_ID}
        onClick={(event) => event.stopPropagation()}
      >
        <Hourglass size={44} aria-hidden="true" className="mp-notice__icon" />
        <h3 id={TITLE_ID} className="mp-notice__title">Estás a un paso de finalizar tu compra</h3>
        <p id={DESC_ID} className="mp-notice__desc">
          Tenés <strong>15 minutos</strong> (hasta las <strong>{deadline}</strong>) para completar el pago en Mercado Pago. Si no se acredita en ese tiempo, se liberará el producto y volverá a estar disponible.
        </p>
        <div className="mp-notice__actions">
          <PrimaryPillButton onClick={onConfirm} disabled={submitting}>Ir a Mercado Pago</PrimaryPillButton>
          <PrimaryPillButton ref={backRef} variant="secondary" onClick={onClose}>Volver</PrimaryPillButton>
        </div>
      </div>
    </div>
  );
};

export default MpRedirectNotice;
