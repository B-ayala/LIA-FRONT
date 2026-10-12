import CheckoutNotice from './CheckoutNotice';
import MyPurchasesButton from './MyPurchasesButton';
import PaidPurchaseNotice from './PaidPurchaseNotice';
import { EXPIRED_MP_MESSAGE } from '../mpDeadline';
import type { AbandonedMpRelease } from '../hooks/useReleaseAbandonedMpPayment';

interface ReleaseNoticeProps {
  release: AbandonedMpRelease;
}

const RetryButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button type="button" className="checkout-notice__action" onClick={onClick}>{label}</button>
);

/** Estado de la compra de Mercado Pago anterior (la que quedó sin resolver al volver con Atrás). */
const ReleaseNotice = ({ release }: ReleaseNoticeProps) => {
  switch (release.status) {
    case 'releasing':
      return <CheckoutNotice tone="progress">Liberando tu reserva anterior…</CheckoutNotice>;
    case 'held':
      return (
        <CheckoutNotice
          tone="warning"
          title="Tu pago todavía se está procesando"
          actions={(
            <>
              <RetryButton onClick={release.retry} label="Verificar de nuevo" />
              <MyPurchasesButton className="checkout-notice__action" />
            </>
          )}
        >
          <p>No vuelvas a pagar: te avisamos en Mis compras cuando se confirme.</p>
        </CheckoutNotice>
      );
    case 'error':
      return (
        <CheckoutNotice
          tone="warning"
          role="alert"
          title="No pudimos verificar tu compra anterior"
          actions={<RetryButton onClick={release.retry} label="Reintentar" />}
        >
          <p>Si ya pagaste en Mercado Pago, no vuelvas a pagar: revisá Mis compras en unos minutos.</p>
        </CheckoutNotice>
      );
    case 'paid':
      // Este aviso solo se ve con productos restantes; con el carrito vacío lo muestra CheckoutSession.
      return <PaidPurchaseNotice hasRemainingItems />;
    case 'released':
      return release.expired
        ? <CheckoutNotice tone="danger" role="alert">{EXPIRED_MP_MESSAGE}</CheckoutNotice>
        : null;
    default:
      return null;
  }
};

export default ReleaseNotice;
