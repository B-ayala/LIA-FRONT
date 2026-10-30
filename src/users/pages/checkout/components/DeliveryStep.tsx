import type { FormEvent, RefObject } from 'react';
import OptionList, { type OptionItem } from './OptionList';
import PillInput from './PillInput';
import PrimaryPillButton from './PrimaryPillButton';
import { useShippingInfo } from '../../../../hooks/useShippingInfo';
import type { ShippingInfo } from '../../../../services/shippingInfoService';
import { SHIPPING_COSTS, SHIPPING_LABEL, formatAmount, type ShippingMethod } from '../checkoutUtils';

const buildShippingOptions = (info: ShippingInfo): OptionItem<ShippingMethod>[] => [
  {
    value: 'correo',
    title: SHIPPING_LABEL.correo,
    aside: `$${formatAmount(SHIPPING_COSTS.correo)}`,
    description: (
      <>
        <span>{info.correoDispatch}</span>
        <span>{info.correoDelivery}</span>
      </>
    ),
    disabled: true,
    disabledReason: 'Temporalmente no disponible.',
  },
  {
    value: 'local',
    title: SHIPPING_LABEL.local,
    aside: 'Gratis',
    description: (
      <>
        <span>Podés retirar el mismo día de la compra.</span>
        <span>Horario: {info.pickupHours}.</span>
        <span>Coordinamos por WhatsApp: esperá la confirmación antes de acercarte.</span>
      </>
    ),
  },
];

const BLOCK_REASON_ID = 'delivery-block-reason';

interface DeliveryStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  buyerEmail: string;
  buyerName: string;
  needsName: boolean;
  onNameChange: (name: string) => void;
  shipping: ShippingMethod;
  onShippingChange: (method: ShippingMethod) => void;
  blockReason: string | null;
  onContinue: () => void;
}

const DeliveryStep = (props: DeliveryStepProps) => {
  const { headingRef, buyerEmail, buyerName, needsName, blockReason, onContinue } = props;
  const shippingOptions = buildShippingOptions(useShippingInfo());

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!blockReason) onContinue();
  };

  return (
    <form className="checkout-step" onSubmit={handleSubmit} noValidate>
      <h2 ref={headingRef} tabIndex={-1} className="checkout-step__title">Datos de contacto</h2>
      <div className="checkout-step__fields">
        <PillInput
          id="checkout-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          value={buyerEmail}
          readOnly
          hint="Es el e-mail de tu cuenta: ahí asociamos tu compra y la ves en “Mis compras”."
        />
        {needsName && (
          <PillInput
            id="checkout-name"
            label="Nombre y apellido"
            autoComplete="name"
            required
            value={buyerName}
            onChange={(event) => props.onNameChange(event.target.value)}
            placeholder="Ej: María González"
          />
        )}
      </div>

      <h2 id="delivery-options-title" className="checkout-step__subtitle">Entrega</h2>
      <OptionList
        name="shipping"
        labelledBy="delivery-options-title"
        options={shippingOptions}
        value={props.shipping}
        onChange={props.onShippingChange}
      />

      <div className="checkout-step__actions">
        <PrimaryPillButton type="submit" disabled={Boolean(blockReason)} aria-describedby={blockReason ? BLOCK_REASON_ID : undefined}>
          Continuar para el pago
        </PrimaryPillButton>
        {blockReason && <p id={BLOCK_REASON_ID} className="checkout-step__reason">{blockReason}</p>}
      </div>
    </form>
  );
};

export default DeliveryStep;
