import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export type CheckoutStep = 'entrega' | 'pago';

const STEP_PARAM = 'paso';
const PAYMENT_STEP_VALUE = 'pago';

interface StepNavState {
  fromDelivery?: boolean;
}

interface CheckoutStepController {
  step: CheckoutStep;
  headingRef: RefObject<HTMLHeadingElement | null>;
  goToPayment: () => void;
  backToDelivery: () => void;
}

/**
 * Paso del checkout sincronizado con `?paso=pago` para que el botón atrás del
 * navegador vuelva a Entrega. Si no se puede estar en Pago (datos inválidos o
 * entrada directa por URL sin datos), se reemplaza la entrada por Entrega.
 */
export const useCheckoutStep = (canEnterPayment: boolean): CheckoutStepController => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const previousStep = useRef<CheckoutStep | null>(null);

  const requested: CheckoutStep = searchParams.get(STEP_PARAM) === PAYMENT_STEP_VALUE ? 'pago' : 'entrega';
  const step: CheckoutStep = requested === 'pago' && !canEnterPayment ? 'entrega' : requested;

  useEffect(() => {
    if (requested === 'pago' && !canEnterPayment) {
      setSearchParams({}, { replace: true });
    }
  }, [requested, canEnterPayment, setSearchParams]);

  // Al cambiar de paso (no en el primer render) el foco va al título del paso nuevo.
  useEffect(() => {
    if (previousStep.current !== null && previousStep.current !== step) {
      headingRef.current?.focus();
      window.scrollTo({ top: 0 });
    }
    previousStep.current = step;
  }, [step]);

  const goToPayment = useCallback(() => {
    const state: StepNavState = { fromDelivery: true };
    setSearchParams({ [STEP_PARAM]: PAYMENT_STEP_VALUE }, { state });
  }, [setSearchParams]);

  const backToDelivery = useCallback(() => {
    // Si llegamos a Pago desde Entrega, "volver" es igual a atrás del navegador:
    // así el historial no acumula entradas Entrega/Pago repetidas.
    if ((location.state as StepNavState | null)?.fromDelivery) {
      navigate(-1);
      return;
    }
    setSearchParams({}, { replace: true });
  }, [location.state, navigate, setSearchParams]);

  return { step, headingRef, goToPayment, backToDelivery };
};
