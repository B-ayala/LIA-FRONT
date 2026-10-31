import type { ReactNode, RefObject } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import DataProtectionNotice from '../../../../components/common/DataProtectionNotice/DataProtectionNotice';
import OptionList, { type OptionItem } from './OptionList';
import PrimaryPillButton from './PrimaryPillButton';
import type { CheckoutTerms } from '../hooks/useCheckoutTerms';
import AnimatedAmount from './AnimatedAmount';
import {
  SHIPPING_LABEL, TRANSFER_ALIAS, formatAmount, type CheckoutTotals, type PaymentMethod, type ShippingMethod,
} from '../checkoutUtils';

const SPRING_POP = { type: 'spring', stiffness: 420, damping: 22 } as const;
const REVEAL_TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

/** "Ahorrás $X": entra con un rebote corto y se rellena de verde cuando la opción está elegida. */
const SavingsBadge = ({ amount, selected }: { amount: number; selected: boolean }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      className={`checkout-step__savings${selected ? ' checkout-step__savings--selected' : ''}`}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_POP}
    >
      Ahorrás ${formatAmount(amount)}
    </motion.span>
  );
};

/** Monto a transferir, visible solo con la transferencia elegida: es lo que la persona copia en su banco. */
const TransferAmount = ({ total, visible }: { total: number; visible: boolean }) => {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.span
          key="transfer-amount"
          className="checkout-step__transfer-amount"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={reduceMotion ? { duration: 0 } : REVEAL_TRANSITION}
        >
          <span className="checkout-step__transfer-amount-inner">
            Total a transferir: <strong><AnimatedAmount value={total} /></strong>
          </span>
        </motion.span>
      )}
    </AnimatePresence>
  );
};

const buildPaymentOptions = (totals: CheckoutTotals, payment: PaymentMethod): OptionItem<PaymentMethod>[] => {
  const transferSelected = payment === 'transfer';
  return [
    {
      value: 'mp',
      title: 'Pagar con Mercado Pago',
      aside: <span className="checkout-step__badge">Recomendado</span>,
      description: <span>Pagá con tarjeta de crédito, débito, dinero en cuenta o cuotas.</span>,
    },
    {
      value: 'transfer',
      title: 'Transferencia por alias',
      aside: totals.transferSavings > 0
        ? <SavingsBadge amount={totals.transferSavings} selected={transferSelected} />
        : undefined,
      description: (
        <>
          <span>Realizá una transferencia bancaria por alias y coordiná el pago con el vendedor.</span>
          <span className="checkout-step__alias">Alias: <strong>{TRANSFER_ALIAS}</strong></span>
          <TransferAmount total={totals.grandTotal} visible={transferSelected} />
          <span>Una vez realizada la transferencia, mandanos el comprobante.</span>
        </>
      ),
    },
  ];
};

/** Anuncia a lectores de pantalla el descuento aplicado al cambiar de medio de pago. */
const paymentAnnouncement = (totals: CheckoutTotals): string =>
  totals.paymentDiscount > 0
    ? `Descuento por transferencia aplicado: ahorrás $${formatAmount(totals.paymentDiscount)}. Total: $${formatAmount(totals.grandTotal)}.`
    : '';

const ctaLabel = (payment: PaymentMethod, submitting: boolean): string => {
  if (submitting) return payment === 'transfer' ? 'Enviando pedido...' : 'Redirigiendo a Mercado Pago...';
  return payment === 'transfer' ? 'Enviar comprobante por WhatsApp' : 'Continuar al pago';
};

interface PaymentStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  buyerEmail: string;
  shipping: ShippingMethod;
  payment: PaymentMethod;
  totals: CheckoutTotals;
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
        options={buildPaymentOptions(props.totals, payment)}
        value={payment}
        onChange={props.onPaymentChange}
      />
      <p className="sr-only" role="status">{paymentAnnouncement(props.totals)}</p>

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
