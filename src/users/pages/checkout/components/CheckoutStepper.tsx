import { Check, CreditCard, ShoppingCart, Truck, type LucideIcon } from 'lucide-react';
import type { CheckoutStep } from '../hooks/useCheckoutStep';
import './CheckoutStepper.css';

type StepStatus = 'done' | 'current' | 'pending';

interface StepDefinition {
  id: 'carrito' | CheckoutStep;
  label: string;
  icon: LucideIcon;
}

const STEPS: StepDefinition[] = [
  { id: 'carrito', label: 'Carrito', icon: ShoppingCart },
  { id: 'entrega', label: 'Entrega', icon: Truck },
  { id: 'pago', label: 'Pago', icon: CreditCard },
];

const ICON_SIZE = 18;

const statusFor = (index: number, currentIndex: number): StepStatus => {
  if (index < currentIndex) return 'done';
  return index === currentIndex ? 'current' : 'pending';
};

interface CheckoutStepperProps {
  current: CheckoutStep;
}

const CheckoutStepper = ({ current }: CheckoutStepperProps) => {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav className="checkout-stepper" aria-label="Pasos de la compra">
      <ol className="checkout-stepper__list">
        {STEPS.map((step, index) => {
          const status = statusFor(index, currentIndex);
          const Icon = status === 'done' ? Check : step.icon;
          return (
            <li
              key={step.id}
              className={`checkout-stepper__item checkout-stepper__item--${status}`}
              aria-current={status === 'current' ? 'step' : undefined}
            >
              <span className="checkout-stepper__circle" aria-hidden="true">
                <Icon size={ICON_SIZE} strokeWidth={2.25} />
              </span>
              <span className="checkout-stepper__label">
                {step.label}
                {status === 'done' && <span className="sr-only"> (completado)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default CheckoutStepper;
