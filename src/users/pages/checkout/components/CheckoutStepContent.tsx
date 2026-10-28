import type { CheckoutFlowState } from '../hooks/useCheckoutFlow';
import DeliveryStep from './DeliveryStep';
import PaymentStep from './PaymentStep';
import TransferCreatedPanel from './TransferCreatedPanel';
import './CheckoutStepContent.css';

interface CheckoutStepContentProps {
  flow: CheckoutFlowState;
}

/** Vista del paso actual: Entrega o Pago. El estado vive en el container, así volver no pierde datos. */
const CheckoutStepContent = ({ flow }: CheckoutStepContentProps) => {
  const { stepper, buyer, pay, blockReason, submitLockReason } = flow;

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
      lockReason={submitLockReason}
      terms={flow.terms}
      canSubmit={blockReason === null && submitLockReason === null}
      completedSlot={pay.transferCreated
        ? <TransferCreatedPanel created={pay.transferCreated} onDone={flow.nudge.finish} />
        : undefined}
      onSubmit={pay.submit}
      onBack={stepper.backToDelivery}
    />
  );
};

export default CheckoutStepContent;
