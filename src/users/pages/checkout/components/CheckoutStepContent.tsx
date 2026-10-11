import type { CheckoutFlowState } from '../hooks/useCheckoutFlow';
import DeliveryStep from './DeliveryStep';
import PaymentStep from './PaymentStep';
import './CheckoutStepContent.css';

interface CheckoutStepContentProps {
  flow: CheckoutFlowState;
}

/** Vista del paso actual: Entrega o Pago. El estado vive en el container, así volver no pierde datos. */
const CheckoutStepContent = ({ flow }: CheckoutStepContentProps) => {
  const { stepper, buyer, pay, blockReason } = flow;

  if (stepper.step === 'entrega') {
    return (
      <DeliveryStep
        headingRef={stepper.headingRef}
        buyerEmail={buyer.email}
        buyerName={buyer.name}
        needsName={buyer.needsName}
        onNameChange={buyer.setName}
        shipping={flow.shipping}
        onShippingChange={flow.setShipping}
        blockReason={blockReason}
        onContinue={stepper.goToPayment}
      />
    );
  }

  return (
    <PaymentStep
      headingRef={stepper.headingRef}
      buyerEmail={buyer.email}
      shipping={flow.shipping}
      payment={flow.payment}
      onPaymentChange={flow.setPayment}
      submitting={pay.submitting}
      error={pay.mpError || blockReason}
      canSubmit={blockReason === null}
      onSubmit={pay.submit}
      onBack={stepper.backToDelivery}
    />
  );
};

export default CheckoutStepContent;
