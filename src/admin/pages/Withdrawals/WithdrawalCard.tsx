import { useState } from 'react';
import { AlertTriangle, Check, Mail, User } from 'lucide-react';
import { formatDate, formatPriceInt } from '../../../utils/formatters';
import {
  WITHDRAWAL_STATUSES,
  WITHDRAWAL_STATUS_LABEL,
  updateWithdrawal,
  type Withdrawal,
  type WithdrawalStatus,
} from '../../../services/withdrawalService';

export const ADMIN_NOTE_MAX_LENGTH = 1000;

type SaveFeedback = { kind: 'success' | 'error'; text: string } | null;

interface WithdrawalCardProps {
  withdrawal: Withdrawal;
  onSaved: () => void;
}

const LinkedSales = ({ withdrawal }: { withdrawal: Withdrawal }) => {
  if (withdrawal.purchases.length === 0) {
    return (
      <p className="withdrawal-admin-unlinked">
        No encontramos una compra con ese email. Revisala a mano con el cliente.
      </p>
    );
  }
  return (
    <ul className="withdrawal-admin-sales" aria-label="Compras vinculadas">
      {withdrawal.purchases.map((sale) => (
        <li key={sale.id}>
          <strong>{sale.order_number !== null ? `Pedido #${sale.order_number}` : 'Pedido anterior a la numeración'}</strong>
          {' · '}{sale.product_name}{' · '}{formatPriceInt(sale.total_price)}
        </li>
      ))}
    </ul>
  );
};

const WithdrawalCard = ({ withdrawal, onSaved }: WithdrawalCardProps) => {
  const [status, setStatus] = useState<WithdrawalStatus>(withdrawal.status);
  const [note, setNote] = useState(withdrawal.admin_note ?? '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<SaveFeedback>(null);

  const dirty = status !== withdrawal.status || note !== (withdrawal.admin_note ?? '');
  const statusId = `withdrawal-status-${withdrawal.id}`;
  const noteId = `withdrawal-note-${withdrawal.id}`;

  const handleSave = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setFeedback(null);
    try {
      await updateWithdrawal(withdrawal.id, { status, adminNote: note.trim() });
      setFeedback({ kind: 'success', text: 'Cambios guardados.' });
      onSaved();
    } catch (error) {
      setFeedback({ kind: 'error', text: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="admin-card withdrawal-admin-card">
      <header className="withdrawal-admin-head">
        <div>
          <h2 className="withdrawal-admin-code">{withdrawal.code}</h2>
          <span className="withdrawal-admin-date">{formatDate(withdrawal.created_at)}</span>
        </div>
        <span className={`withdrawal-badge withdrawal-badge--${withdrawal.status}`}>
          {WITHDRAWAL_STATUS_LABEL[withdrawal.status]}
        </span>
      </header>

      {withdrawal.needs_review && (
        <p className="withdrawal-admin-review" role="note">
          <AlertTriangle size={15} aria-hidden="true" /> Requiere revisión manual
        </p>
      )}

      <div className="withdrawal-admin-person">
        <span><User size={14} aria-hidden="true" /> {withdrawal.name}</span>
        <a href={`mailto:${withdrawal.email}`}><Mail size={14} aria-hidden="true" /> {withdrawal.email}</a>
      </div>

      <p className="withdrawal-admin-description">{withdrawal.description}</p>
      {withdrawal.order_number !== null && (
        <p className="withdrawal-admin-declared">El cliente indicó el pedido #{withdrawal.order_number}.</p>
      )}

      <LinkedSales withdrawal={withdrawal} />

      <div className="withdrawal-admin-controls">
        <div className="withdrawal-admin-field">
          <label htmlFor={statusId}>Estado</label>
          <select id={statusId} value={status} onChange={(e) => setStatus(e.currentTarget.value as WithdrawalStatus)} disabled={saving}>
            {WITHDRAWAL_STATUSES.map((value) => (
              <option key={value} value={value}>{WITHDRAWAL_STATUS_LABEL[value]}</option>
            ))}
          </select>
        </div>
        <div className="withdrawal-admin-field withdrawal-admin-field--note">
          <label htmlFor={noteId}>Nota interna</label>
          <textarea
            id={noteId} rows={2} value={note} maxLength={ADMIN_NOTE_MAX_LENGTH}
            onChange={(e) => setNote(e.currentTarget.value)} disabled={saving}
          />
        </div>
      </div>

      <div className="withdrawal-admin-actions">
        {feedback && (
          <span className={`withdrawal-admin-feedback withdrawal-admin-feedback--${feedback.kind}`} role="status">
            {feedback.kind === 'success' && <Check size={14} aria-hidden="true" />} {feedback.text}
          </span>
        )}
        <button type="button" className="admin-btn-primary" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </article>
  );
};

export default WithdrawalCard;
