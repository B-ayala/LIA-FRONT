import { useId, type KeyboardEvent } from 'react';

interface SaleConfirmDialogProps {
  message: string;
  confirmLabel: string;
  busyLabel: string;
  danger?: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmación de una acción sensible sobre una venta. Mientras corre no se puede cerrar ni repetir. */
const SaleConfirmDialog = ({ message, confirmLabel, busyLabel, danger = false, busy, onConfirm, onCancel }: SaleConfirmDialogProps) => {
  const messageId = useId();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !busy) onCancel();
  };

  return (
    <div className="confirm-overlay" onClick={busy ? undefined : onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-describedby={messageId}
        aria-label="Confirmar acción"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <p id={messageId} className="confirm-message">{message}</p>
        <div className="confirm-actions">
          {/* Foco inicial en la opción segura. */}
          <button type="button" className="admin-btn-secondary" onClick={onCancel} disabled={busy} autoFocus>
            Volver
          </button>
          <button
            type="button"
            className={danger ? 'admin-btn-danger' : 'admin-btn-primary'}
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleConfirmDialog;
