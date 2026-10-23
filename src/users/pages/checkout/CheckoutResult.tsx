import { buildCloudinaryUrl } from '../../../utils/cloudinary';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SEO from '../../../components/common/SEO/SEO';
import { useInitialLoadTask } from '../../../components/common/InitialLoad/InitialLoadProvider';
import { formatAmount, parseReturnShipping, type CheckoutReturnState } from './checkoutUtils';
import { useMpResultSettlement, type ResultStatus } from './hooks/useMpResultSettlement';
import { resolveResultView } from './resultContent';
import MyPurchasesButton from './components/MyPurchasesButton';
import type { LastOrder } from './mpPendingPurchase';
import './CheckoutResult.css';

const parseStatus = (mpStatus: string): ResultStatus => {
    if (mpStatus === 'approved') return 'approved';
    if (mpStatus === 'pending' || mpStatus === 'in_process') return 'pending';
    if (mpStatus === 'null' || mpStatus === 'rejected' || mpStatus === 'cancelled') return 'failure';
    return 'unknown';
};

const OrderDetail = ({ order }: { order: LastOrder }) => (
    <div className="checkout-result-products">
        {order.items.map((orderItem, index) => (
            <div key={`${orderItem.productName}-${index}`} className="checkout-result-product">
                <img src={buildCloudinaryUrl(orderItem.productImage, { width: 128, crop: 'limit' })} alt={orderItem.productName} className="checkout-result-product-img" />
                <div className="checkout-result-product-info">
                    <p className="checkout-result-product-name">{orderItem.productName}</p>
                    <p className="checkout-result-product-qty">Cantidad: {orderItem.quantity}</p>
                    <p className="checkout-result-product-total">Subtotal: ${formatAmount(orderItem.totalPrice)}</p>
                </div>
            </div>
        ))}
        <div className="checkout-result-totals">
            {typeof order.itemsSubtotal === 'number' && (
                <p className="checkout-result-total-line">Subtotal productos: ${formatAmount(order.itemsSubtotal)}</p>
            )}
            <p className="checkout-result-total-line checkout-result-total-line--grand">Total: ${formatAmount(order.grandTotal)}</p>
        </div>
    </div>
);

const CheckoutResult = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    useInitialLoadTask('route', false);

    // MP envía: collection_status=approved|pending|null, status=approved|pending|null,
    // external_reference=order_ids, payment_id/collection_id=id del pago
    const status = parseStatus(params.get('collection_status') ?? params.get('status') ?? '');
    const { lastOrder, confirm, cancel, retryCancel } = useMpResultSettlement({
        status,
        paymentId: params.get('payment_id') ?? params.get('collection_id') ?? '',
        externalRef: params.get('external_reference') ?? '',
    });
    const view = resolveResultView({ status, confirm, cancel, shippingMethod: lastOrder?.shippingMethod });

    // Reabre el checkout en el paso de pago con el envío ya elegido (el estado del
    // checkout es local y se pierde al salir a Mercado Pago).
    const handleBackToCheckout = () => {
        const shipping = parseReturnShipping({ shipping: lastOrder?.shippingMethod });
        if (shipping) {
            const returnState: CheckoutReturnState = { shipping };
            navigate('/checkout?paso=pago', { state: returnState });
            return;
        }
        navigate('/checkout');
    };

    return (
        <div className="checkout-result-page">
            <SEO title="Resultado de Compra" description="Estado de tu compra en LIA." path="/checkout/result" />
            <div className={`checkout-result-card ${view.tone}`} aria-busy={view.busy || undefined}>
                <div className="checkout-result-icon" aria-hidden="true">{view.icon}</div>
                <h1 className="checkout-result-title">{view.title}</h1>
                <p className="checkout-result-desc" role="status">{view.desc}</p>
                {view.note && <p className="checkout-result-note" role="status">{view.note}</p>}

                {lastOrder && status !== 'unknown' && <OrderDetail order={lastOrder} />}

                <div className="checkout-result-actions">
                    <button className="checkout-result-btn primary" onClick={() => navigate('/products')}>
                        Ver más productos
                    </button>
                    {view.showMyPurchases && <MyPurchasesButton className="checkout-result-btn secondary" />}
                    {view.showRetryRelease && (
                        <button className="checkout-result-btn secondary" onClick={retryCancel}>
                            Reintentar
                        </button>
                    )}
                    {view.showBackToCheckout && (
                        <button className="checkout-result-btn secondary" onClick={handleBackToCheckout}>
                            Volver al checkout
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckoutResult;
