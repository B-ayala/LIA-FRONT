import type { IconType } from 'react-icons';
import { FiBox, FiCheck, FiCheckCircle, FiClock, FiMapPin, FiTruck } from 'react-icons/fi';
import { DISPATCH_STATUS_LABEL } from '../../../../utils/labels';
import './DispatchTracker.css';

type TrackerStatus = 'pendiente' | 'en_preparacion' | 'despachado' | 'listo_para_retiro' | 'entregado';

interface TrackerStep {
  status: TrackerStatus;
  icon: IconType;
}

interface DispatchTrackerProps {
  status: string | null;
  shippingMethod: string | null;
}

const PICKUP_METHOD = 'local';

const FIRST_STEPS: TrackerStep[] = [
  { status: 'pendiente', icon: FiClock },
  { status: 'en_preparacion', icon: FiBox },
];
const LAST_STEP: TrackerStep = { status: 'entregado', icon: FiCheckCircle };
const PICKUP_STEP: TrackerStep = { status: 'listo_para_retiro', icon: FiMapPin };
const SHIPPING_STEP: TrackerStep = { status: 'despachado', icon: FiTruck };

// despachado y listo_para_retiro ocupan la misma posición: nunca coexisten en un mismo pedido.
const STATUS_RANK: Record<TrackerStatus, number> = {
  pendiente: 0,
  en_preparacion: 1,
  despachado: 2,
  listo_para_retiro: 2,
  entregado: 3,
};

const STATUS_HINT: Record<TrackerStatus, string> = {
  pendiente: 'Recibimos tu compra. En breve empezamos a prepararla.',
  en_preparacion: 'Estamos preparando tu pedido con cariño.',
  despachado: 'Tu pedido ya salió. ¡Está en camino!',
  listo_para_retiro: 'Tu pedido te espera en el local.',
  entregado: '¡Pedido entregado! Gracias por tu compra.',
};

type StepState = 'done' | 'current' | 'todo';

const STEP_STATE_SR_TEXT: Record<StepState, string> = {
  done: 'completado',
  current: 'paso actual',
  todo: 'pendiente',
};

const isTrackerStatus = (value: string): value is TrackerStatus => Object.hasOwn(STATUS_RANK, value);

// El estado real manda sobre el método de envío: un dato histórico inconsistente
// (ej. local + despachado) no debe mostrar un paso que contradiga al estado.
const pickMiddleStep = (status: TrackerStatus, shippingMethod: string | null): TrackerStep => {
  if (status === 'despachado') return SHIPPING_STEP;
  if (status === 'listo_para_retiro') return PICKUP_STEP;
  return shippingMethod === PICKUP_METHOD ? PICKUP_STEP : SHIPPING_STEP;
};

const buildSteps = (status: TrackerStatus, shippingMethod: string | null): TrackerStep[] => [
  ...FIRST_STEPS,
  pickMiddleStep(status, shippingMethod),
  LAST_STEP,
];

const stepState = (index: number, currentIndex: number): StepState => {
  if (index < currentIndex) return 'done';
  return index === currentIndex ? 'current' : 'todo';
};

const DispatchTracker = ({ status, shippingMethod }: DispatchTrackerProps) => {
  // La base puede traer null: se lo trata como 'pendiente' (igual que el panel admin).
  const safeStatus: TrackerStatus = status && isTrackerStatus(status) ? status : 'pendiente';
  const steps = buildSteps(safeStatus, shippingMethod);
  const currentIndex = STATUS_RANK[safeStatus];
  const currentStep = steps[currentIndex];

  return (
    <div className="dispatch-tracker" data-status={safeStatus}>
      <ol className="dispatch-tracker__steps" aria-label="Seguimiento de tu pedido">
        {steps.map(({ status: stepStatus, icon: Icon }, index) => {
          const state = stepState(index, currentIndex);
          const NodeIcon = state === 'done' ? FiCheck : Icon;
          return (
            <li
              key={stepStatus}
              className={`dispatch-tracker__step dispatch-tracker__step--${state}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="dispatch-tracker__node">
                <NodeIcon size={16} aria-hidden="true" />
              </span>
              <span className="dispatch-tracker__label">
                {DISPATCH_STATUS_LABEL[stepStatus]}
                <span className="dispatch-tracker__sr-only">, {STEP_STATE_SR_TEXT[state]}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="dispatch-tracker__hint">{STATUS_HINT[currentStep.status]}</p>
    </div>
  );
};

export default DispatchTracker;
