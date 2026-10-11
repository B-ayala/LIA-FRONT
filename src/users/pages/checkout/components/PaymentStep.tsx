import type { RefObject } from 'react';
import OptionList, { type OptionItem } from './OptionList';
import PrimaryPillButton from './PrimaryPillButton';
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
  canSubmit: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

const PaymentStep = (props: PaymentStepProps) => {
  const { headingRef, payment, submitting, error } = props;

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

      <div className="checkout-step__actions">
        {error && <p className="checkout-step__error" role="alert">{error}</p>}
        <PrimaryPillButton onClick={props.onSubmit} disabled={!props.canSubmit} loading={submitting}>
          {ctaLabel(payment, submitting)}
        </PrimaryPillButton>
      </div>
    </div>
  );
};

export default PaymentStep;
