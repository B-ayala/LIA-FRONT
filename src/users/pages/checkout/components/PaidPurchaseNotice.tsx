import { Link } from 'react-router-dom';
import CheckoutNotice from './CheckoutNotice';
import MyPurchasesButton from './MyPurchasesButton';

interface PaidPurchaseNoticeProps {
  /** Quedan otros productos en el carrito (los comprados ya se quitaron). */
  hasRemainingItems: boolean;
}

/** La compra anterior de Mercado Pago ya estaba pagada: no hay que volver a pagar. */
const PaidPurchaseNotice = ({ hasRemainingItems }: PaidPurchaseNoticeProps) => (
  <CheckoutNotice
    tone="success"
    role="alert"
    title="¡Tu pago ya fue acreditado!"
    actions={(
      <>
        <MyPurchasesButton className="checkout-notice__action" />
        {!hasRemainingItems && (
          <Link to="/products" className="checkout-notice__action">Seguir comprando</Link>
        )}
      </>
    )}
  >
    <p>
      {hasRemainingItems
        ? 'Sacamos del carrito lo que ya pagaste. Si querés, podés seguir con el resto de tu pedido.'
        : 'No tenés que volver a pagar. Podés ver el detalle en Mis compras.'}
    </p>
  </CheckoutNotice>
);

export default PaidPurchaseNotice;
