import type { ReactNode, RefObject } from 'react';
import { Link } from 'react-router-dom';
import DataProtectionNotice from '../../../../components/common/DataProtectionNotice/DataProtectionNotice';
import OptionList, { type OptionItem } from './OptionList';
import PrimaryPillButton from './PrimaryPillButton';
import type { CheckoutTerms } from '../hooks/useCheckoutTerms';
import { SHIPPING_LABEL, TRANSFER_ALIAS, type PaymentMethod, type ShippingMethod } from '../checkoutUtils';

const PAYMENT_OPTIONS: OptionItem<PaymentMethod>[] = [
  {
    value: 'mp',
    title: 'Pagar con Mercado Pago',
    aside: <span className="checkout-step__badge">Recomendado</span>,
    description: <span>Pagá con tarjeta de crédito, débito, dinero en cuenta o cuotas.</span>,
  },
  {
    value: 'transfer',
    title: 'Transferencia por alias',
    description: (
      <>
        <span>Realizá una transferencia bancaria por alias y coordiná el pago con el vendedor.</span>
        <span className="checkout-step__alias">Alias: <strong>{TRANSFER_ALIAS}</strong></span>
        <span>Una vez realizada la transferencia, mandanos el comprobante.</span>
      </>
    ),
  },
];

const ctaLabel = (payment: PaymentMethod, submitting: boolean): string => {
  if (submitting) return payment === 'transfer' ? 'Enviando pedido...' : 'Redirigiendo a Mercado Pago...';
  return payment === 'transfer' ? 'Enviar comprobante por WhatsApp' : 'Continuar al pago';
};

interface PaymentStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  buyerEmail: string;
  shipping: ShippingMethod;
  payment: PaymentMethod;
  onPaymentChange: (method: PaymentMethod) => void;
  submitting: boolean;
  error: string | null;
  /** Motivo (no error) por el que el CTA está bloqueado: verificando stock, reserva anterior, términos, etc. */
  lockReason: string | null;
  terms: CheckoutTerms;
  canSubmit: boolean;
  /** Reemplaza al CTA (p. ej. "Pedido creado"): evita un segundo envío. */
  completedSlot?: ReactNode;
  onSubmit: () => void;
  onBack: () => void;
}

interface TermsNoticeProps {
  terms: CheckoutTerms;
  disabled: boolean;
}

/** Cuentas que ya aceptaron la versión vigente: aviso fijo. Si no, el tilde (se pide una sola vez por versión). */
const TermsNotice = ({ terms, disabled }: TermsNoticeProps) => {
  if (terms.needsCheckbox) {
    return (
      <label className="checkout-step__terms">
        <input
          type="checkbox"
          checked={terms.checked}
          onChange={(event) => terms.setChecked(event.currentTarget.checked)}
          disabled={disabled}
        />
        <span>
          Leí y acepto los <Link to="/terminos" target="_blank" rel="noopener noreferrer">términos y condiciones</Link>{' '}
          (versión {terms.version}) y la{' '}
          <Link to="/privacidad" target="_blank" rel="noopener noreferrer">política de privacidad</Link>.
        </span>
      </label>
    );
  }
  if (terms.alreadyAccepted) {
    return (
      <p className="checkout-step__terms-notice">
        Al pagar aceptás los <Link to="/terminos" target="_blank" rel="noopener noreferrer">Términos y condiciones</Link>{' '}
        (versión {terms.version}) y la{' '}
        <Link to="/privacidad" target="_blank" rel="noopener noreferrer">Política de privacidad</Link>.
      </p>
    );
  }
  return null;
};

const PaymentStep = (props: PaymentStepProps) => {
  const { headingRef, payment, submitting, error, lockReason } = props;

  return (
    <div className="checkout-step">
      <h2 ref={headingRef} tabIndex={-1} className="checkout-step__title">Pago</h2>

      <div className="checkout-step__review">
        <dl className="checkout-step__review-list">
          <div><dt>Contacto</dt><dd>{props.buyerEmail}</dd></div>
          <div><dt>Entrega</dt><dd>{SHIPPING_LABEL[props.shipping]}</dd></div>
        </dl>
        <button type="button" className="checkout-step__link" onClick={props.onBack} disabled={submitting}>
          Modificar
        </button>
      </div>

      <h3 id="payment-options-title" className="checkout-step__subtitle">Elegí cómo pagar</h3>
      <OptionList
        name="payment"
        labelledBy="payment-options-title"
        options={PAYMENT_OPTIONS}
        value={payment}
        onChange={props.onPaymentChange}
      />

      <TermsNotice terms={props.terms} disabled={submitting} />
      <DataProtectionNotice />

      <div className="checkout-step__actions">
        {props.completedSlot ?? (
          <>
            {error && <p className="checkout-step__error" role="alert">{error}</p>}
            {!error && lockReason && <p className="checkout-step__reason" role="status">{lockReason}</p>}
            <PrimaryPillButton onClick={props.onSubmit} disabled={!props.canSubmit} loading={submitting}>
              {ctaLabel(payment, submitting)}
            </PrimaryPillButton>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentStep;
