import CheckoutNotice from './CheckoutNotice';
import type { CartFreshness } from '../hooks/useCartFreshness';

/** Aviso de la verificación de precio/stock al entrar al checkout (solo cuando hay algo que decir). */
const FreshnessNotice = ({ freshness }: { freshness: CartFreshness }) => {
  if (freshness.status === 'loading') {
    return <CheckoutNotice tone="progress">Verificando precio y stock de tu pedido…</CheckoutNotice>;
  }
  if (freshness.status === 'error') {
    return (
      <CheckoutNotice
        tone="warning"
        title="No pudimos verificar el precio y el stock actuales"
        actions={(
          <button type="button" className="checkout-notice__action" onClick={freshness.refresh}>Reintentar</button>
        )}
      >
        <p>Podés seguir: al confirmar el pedido lo volvemos a validar.</p>
      </CheckoutNotice>
    );
  }
  if (freshness.repricedNames.length > 0) {
    return (
      <CheckoutNotice tone="info" title="Actualizamos precios">
        <p>Cambió el precio de: {freshness.repricedNames.join(', ')}. Revisá el total antes de pagar.</p>
      </CheckoutNotice>
    );
  }
  return null;
};

export default FreshnessNotice;
