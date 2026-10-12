import { PAYMENT_STATUS_LABEL } from '../../../utils/labels';
import { getEffectiveStatus, type ReviewReason, type Sale } from './salesQueries';
import type { SaleAction } from './useSaleActions';

const REVIEW_LABEL: Record<ReviewReason, { label: string; hint: string }> = {
  amount_mismatch: { label: 'Revisar: monto distinto', hint: 'Mercado Pago acreditó un monto distinto al de la venta.' },
  duplicate_payment: { label: 'Revisar: cobro duplicado', hint: 'Hay más de un pago aprobado para esta venta: evaluá reembolsar uno.' },
  refunded: { label: 'Revisar: reembolsado', hint: 'El pago fue reembolsado en Mercado Pago.' },
  charged_back: { label: 'Revisar: contracargo', hint: 'El comprador desconoció el pago (contracargo) en Mercado Pago.' },
};

// Etiquetas de alerta: pago sin stock (`oversold`) y conciliación con MP (`review_reason`).
const SaleAlertTags = ({ sale }: { sale: Sale }) => {
  const review = sale.review_reason ? REVIEW_LABEL[sale.review_reason] : undefined;
  return (
    <>
      {sale.oversold && (
        <span className="sale-alert-tag" title="El pago se acreditó cuando ya no había stock. Reembolsá o conseguí la mercadería.">
          Sin stock: reembolsar
        </span>
      )}
      {review && <span className="sale-alert-tag" title={review.hint}>{review.label}</span>}
    </>
  );
};

interface SaleStatusCellProps {
  sale: Sale;
  onRequest: (sale: Sale, action: SaleAction) => void;
}

/** Estado de pago de una venta con las acciones del admin que correspondan a ese estado. */
const SaleStatusCell = ({ sale, onRequest }: SaleStatusCellProps) => {
  const status = getEffectiveStatus(sale);
  const isTransfer = sale.payment_method === 'transfer';

  if (isTransfer && status === 'pendiente') {
    return (
      <select
        className="transfer-status-select pendiente"
        value="pendiente"
        aria-label={`Estado de pago de ${sale.product_name}`}
        onChange={(e) => {
          if (e.target.value === 'pagado') onRequest(sale, 'confirm');
          if (e.target.value === 'cancelado') onRequest(sale, 'cancel');
        }}
      >
        <option value="pendiente">Pendiente</option>
        <option value="pagado">Pagado</option>
        <option value="cancelado">Cancelado</option>
      </select>
    );
  }

  return (
    <div className="sale-status-cell">
      <span className={`payment-badge ${status}`}>{PAYMENT_STATUS_LABEL[status] ?? status}</span>
      <SaleAlertTags sale={sale} />
      {/* Solo la que el backend ya marcó `expirado` (contrato: 409 si no lo es). */}
      {isTransfer && sale.payment_status === 'expirado' && (
        <button type="button" className="admin-btn-secondary sale-late-btn" onClick={() => onRequest(sale, 'late')}>
          Confirmar pago tardío
        </button>
      )}
    </div>
  );
};

export default SaleStatusCell;
