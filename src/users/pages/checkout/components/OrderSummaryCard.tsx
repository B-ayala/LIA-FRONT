import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CheckoutItem } from '../../../../store/cartStore';
import { formatAmount, type CheckoutTotals } from '../checkoutUtils';
import VariantTags from './VariantTags';
import './OrderSummaryCard.css';

const THUMB_SIZE = 64;

const SummaryItem = ({ item }: { item: CheckoutItem }) => (
  <li className="order-summary__item">
    <img
      src={item.product.image}
      alt=""
      width={THUMB_SIZE}
      height={THUMB_SIZE}
      loading="lazy"
      className="order-summary__thumb"
    />
    <div className="order-summary__item-info">
      <p className="order-summary__item-name">
        {item.product.name} <span className="order-summary__item-qty">× {item.quantity}</span>
      </p>
      <VariantTags unitVariants={item.unitVariants} />
    </div>
    <span className="order-summary__item-price">${formatAmount(item.totalPrice)}</span>
  </li>
);

interface OrderSummaryCardProps {
  items: CheckoutItem[];
  totals: CheckoutTotals;
}

/** Resumen del pedido: card sticky en desktop; en mobile se colapsa mostrando el total en el encabezado. */
const OrderSummaryCard = ({ items, totals }: OrderSummaryCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const total = `$${formatAmount(totals.grandTotal)}`;

  return (
    <section className={`order-summary${expanded ? ' order-summary--expanded' : ''}`} aria-labelledby={`${bodyId}-title`}>
      <h2 id={`${bodyId}-title`} className="order-summary__title">Resumen de compra</h2>
      <button
        type="button"
        className="order-summary__toggle"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((open) => !open)}
      >
        <span>{expanded ? 'Ocultar resumen' : 'Ver resumen'}</span>
        <ChevronDown size={18} aria-hidden="true" className="order-summary__chevron" />
        <span className="order-summary__toggle-total">{total}</span>
      </button>

      <div id={bodyId} className="order-summary__body">
        <ul className="order-summary__items">
          {items.map((item) => <SummaryItem key={String(item.product.id)} item={item} />)}
        </ul>
        <dl className="order-summary__totals">
          <div className="order-summary__row">
            <dt>Subtotal</dt>
            <dd>${formatAmount(totals.itemsSubtotal)}</dd>
          </div>
          <div className="order-summary__row">
            <dt>Envío</dt>
            <dd className={totals.shippingCost === 0 ? 'order-summary__free' : undefined}>
              {totals.shippingCost === 0 ? 'Gratis' : `$${formatAmount(totals.shippingCost)}`}
            </dd>
          </div>
          <div className="order-summary__row order-summary__row--total">
            <dt>Total</dt>
            <dd>{total}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
};

export default OrderSummaryCard;
