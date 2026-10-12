import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CheckoutItem } from '../../../store/cartStore';
import { useAuthStore } from '../../../store/authStore';
import type { AuthUser } from '../../../store/authStore';
import AuthModal from '../../components/auth/AuthModal';
import PurchaseNudgeModal from '../../components/PurchaseNudgeModal/PurchaseNudgeModal';
import SEO from '../../../components/common/SEO/SEO';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import { useInitialLoadTask } from '../../../components/common/InitialLoad/InitialLoadProvider';
import CheckoutStepper from './components/CheckoutStepper';
import CheckoutStepContent from './components/CheckoutStepContent';
import OrderSummaryCard from './components/OrderSummaryCard';
import MpRedirectNotice from './components/MpRedirectNotice';
import PrimaryPillButton from './components/PrimaryPillButton';
import { useCheckoutItems } from './hooks/useCheckoutItems';
import { useCheckoutFlow } from './hooks/useCheckoutFlow';
import { EXPIRED_MP_MESSAGE } from './mpDeadline';
import { useReleaseAbandonedMpPayment } from './hooks/useReleaseAbandonedMpPayment';
import './Checkout.css';

const STEP_ANNOUNCEMENT = {
  entrega: 'Paso 2 de 3: Entrega',
  pago: 'Paso 3 de 3: Pago',
} as const;

interface CheckoutFlowProps {
  user: AuthUser;
  items: CheckoutItem[];
  isDirectPurchase: boolean;
}

const CheckoutFlow = ({ user, items, isDirectPurchase }: CheckoutFlowProps) => {
  const flow = useCheckoutFlow(user, items, isDirectPurchase);
  const { stepper, pay, nudge } = flow;
  const paymentExpired = useReleaseAbandonedMpPayment();

  return (
    <div className="checkout-page">
      <h1 className="sr-only">Finalizar compra</h1>
      {paymentExpired && (
        <p className="checkout-expired" role="alert">{EXPIRED_MP_MESSAGE}</p>
      )}
      <CheckoutStepper current={stepper.step} />
      <p className="sr-only" aria-live="polite">{STEP_ANNOUNCEMENT[stepper.step]}</p>

      <div className="checkout-layout">
        <aside className="checkout-layout__summary" aria-label="Tu pedido">
          <OrderSummaryCard items={items} totals={flow.totals} />
        </aside>
        <div className="checkout-layout__main">
          <CheckoutStepContent flow={flow} />
        </div>
      </div>

      <MpRedirectNotice
        open={pay.mpNoticeOpen}
        submitting={pay.submitting}
        onConfirm={pay.confirmMpRedirect}
        onClose={pay.closeMpNotice}
      />
      <PurchaseNudgeModal
        isOpen={nudge.nudgeOpen}
        busy={nudge.nudgeBusy}
        error={nudge.nudgeError}
        onRespond={nudge.respond}
        onDismiss={nudge.finish}
      />
    </div>
  );
};

const LoginGate = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  return (
    <div className="checkout-gate">
      <p className="checkout-gate__text">Tenés que iniciar sesión para continuar con la compra.</p>
      <div className="checkout-gate__action">
        <PrimaryPillButton onClick={() => setShowAuthModal(true)}>Iniciar sesión</PrimaryPillButton>
      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
};

const CHECKOUT_SEO = (
  <SEO
    title="Checkout"
    description="Completá tu compra en LIA. Revisá tu pedido, elegí la forma de entrega y pagá de forma segura."
    path="/checkout"
  />
);

const Checkout = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const authInitialized = useAuthStore((s) => s.authInitialized);
  const { items, isDirectPurchase } = useCheckoutItems();
  // Sin esto, entrar en frío o recargar /checkout dejaba el splash inicial colgado
  // (la ruta nunca marcaba 'route' como lista desde que se quitó la espera artificial).
  useInitialLoadTask('route', false);

  useEffect(() => {
    if (items.length === 0) navigate('/products');
  }, [items.length, navigate]);

  // Con usuario hidratado desde storage no bloqueamos: el backend autoriza igual en cada llamada.
  if (!authInitialized && !currentUser) {
    return (
      <div className="checkout-gate" role="status">
        <LiaLoader size="lg" />
        <p className="checkout-gate__text">Recuperando tu sesión...</p>
      </div>
    );
  }

  if (!currentUser) return <LoginGate />;
  if (items.length === 0) return null;

  return (
    <>
      {CHECKOUT_SEO}
      <CheckoutFlow user={currentUser} items={items} isDirectPurchase={isDirectPurchase} />
    </>
  );
};

export default Checkout;
