import { useEffect, useMemo, useState } from 'react';
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
import ReleaseNotice from './components/ReleaseNotice';
import FreshnessNotice from './components/FreshnessNotice';
import CheckoutItemIssues from './components/CheckoutItemIssues';
import PaidPurchaseNotice from './components/PaidPurchaseNotice';
import { useCheckoutItems } from './hooks/useCheckoutItems';
import { useCheckoutFlow } from './hooks/useCheckoutFlow';
import { useReleaseAbandonedMpPayment, type AbandonedMpRelease } from './hooks/useReleaseAbandonedMpPayment';
import './Checkout.css';

const STEP_ANNOUNCEMENT = {
  entrega: 'Paso 2 de 3: Entrega',
  pago: 'Paso 3 de 3: Pago',
} as const;

interface CheckoutFlowProps {
  user: AuthUser;
  items: CheckoutItem[];
  isDirectPurchase: boolean;
  release: AbandonedMpRelease;
}

const CheckoutFlow = ({ user, items, isDirectPurchase, release }: CheckoutFlowProps) => {
  const flow = useCheckoutFlow(user, items, isDirectPurchase, release.status);
  const { stepper, pay, nudge, freshness } = flow;
  const stockErrorProductId = pay.stockError?.productId;
  const issueIds = useMemo(() => {
    const ids = new Set(Object.keys(freshness.issues));
    if (stockErrorProductId) ids.add(stockErrorProductId);
    return ids;
  }, [freshness.issues, stockErrorProductId]);

  return (
    <div className="checkout-page">
      <h1 className="sr-only">Finalizar compra</h1>
      <div className="checkout-notices">
        <ReleaseNotice release={release} />
        <FreshnessNotice freshness={freshness} />
        <CheckoutItemIssues flow={flow} />
      </div>
      <CheckoutStepper current={stepper.step} />
      <p className="sr-only" aria-live="polite">{STEP_ANNOUNCEMENT[stepper.step]}</p>

      <div className="checkout-layout">
        <aside className="checkout-layout__summary" aria-label="Tu pedido">
          <OrderSummaryCard items={items} totals={flow.totals} issueIds={issueIds} />
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

interface CheckoutSessionProps {
  user: AuthUser;
  items: CheckoutItem[];
  isDirectPurchase: boolean;
}

/**
 * Sesión de checkout de un usuario concreto. La consulta de la compra de Mercado Pago anterior
 * vive acá (y no en CheckoutFlow) porque, si ya estaba pagada, se quitan esos productos del
 * carrito: con el carrito vacío hay que mostrar el aviso en vez de redirigir a /products.
 */
const CheckoutSession = ({ user, items, isDirectPurchase }: CheckoutSessionProps) => {
  const navigate = useNavigate();
  const release = useReleaseAbandonedMpPayment(user.email);
  const isPaid = release.status === 'paid';

  useEffect(() => {
    if (items.length === 0 && !isPaid) navigate('/products');
  }, [items.length, isPaid, navigate]);

  if (items.length === 0) {
    return isPaid ? (
      <div className="checkout-page">
        <h1 className="sr-only">Finalizar compra</h1>
        <div className="checkout-notices checkout-notices--standalone">
          <PaidPurchaseNotice hasRemainingItems={false} />
        </div>
      </div>
    ) : null;
  }

  return <CheckoutFlow user={user} items={items} isDirectPurchase={isDirectPurchase} release={release} />;
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

  // Con sesión, la redirección por carrito vacío la decide CheckoutSession.
  useEffect(() => {
    if (items.length === 0 && !currentUser) navigate('/products');
  }, [items.length, currentUser, navigate]);

  // La sesión se recupera al cargar la app: hasta entonces no sabemos si hay usuario.
  if (!authInitialized && !currentUser) {
    return (
      <div className="checkout-gate" role="status">
        <LiaLoader size="lg" />
        <p className="checkout-gate__text">Recuperando tu sesión...</p>
      </div>
    );
  }

  if (!currentUser) return items.length === 0 ? null : <LoginGate />;

  return (
    <>
      {CHECKOUT_SEO}
      <CheckoutSession
        key={currentUser.email}
        user={currentUser}
        items={items}
        isDirectPurchase={isDirectPurchase}
      />
    </>
  );
};

export default Checkout;
