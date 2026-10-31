import { buildCloudinaryUrl } from '../../../../utils/cloudinary';
import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { CheckoutItem } from '../../../../store/cartStore';
import { formatAmount, type CheckoutTotals } from '../checkoutUtils';
import AnimatedAmount from './AnimatedAmount';
import VariantTags from './VariantTags';
import './OrderSummaryCard.css';

const THUMB_SIZE = 64;
// El `gap` de la lista de totales (--space-2) aparece de golpe al montar la fila: el margen
// negativo lo compensa mientras la fila crece.
const TOTALS_GAP_PX = 8;
const ROW_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };
const ROW_HIDDEN = { opacity: 0, height: 0, marginTop: -TOTALS_GAP_PX, y: -6 };
const ROW_SHOWN = { opacity: 1, height: 'auto', marginTop: 0, y: 0 };

const SummaryItem = ({ item, hasIssue }: { item: CheckoutItem; hasIssue: boolean }) => (
  <li className={`order-summary__item${hasIssue ? ' order-summary__item--issue' : ''}`}>
    <img
      src={buildCloudinaryUrl(item.product.image, { width: THUMB_SIZE * 2, crop: 'limit' })}
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
      {hasIssue && <p className="order-summary__item-issue">Revisá este producto</p>}
    </div>
    <span className="order-summary__item-price">${formatAmount(item.totalPrice)}</span>
  </li>
);

interface OrderSummaryCardProps {
  items: CheckoutItem[];
  totals: CheckoutTotals;
  /** Ids de producto con problemas de stock/talle: la línea se resalta. */
  issueIds?: ReadonlySet<string>;
}

/** Resumen del pedido: card sticky en desktop; en mobile se colapsa mostrando el total en el encabezado. */
const OrderSummaryCard = ({ items, totals, issueIds }: OrderSummaryCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const reduceMotion = useReducedMotion();

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
        <AnimatedAmount value={totals.grandTotal} className="order-summary__toggle-total" />
      </button>

      <div id={bodyId} className="order-summary__body">
        <ul className="order-summary__items">
          {items.map((item) => (
            <SummaryItem key={String(item.product.id)} item={item} hasIssue={issueIds?.has(String(item.product.id)) ?? false} />
          ))}
        </ul>
        <dl className="order-summary__totals">
          <div className="order-summary__row">
            <dt>Subtotal</dt>
            <dd>${formatAmount(totals.itemsSubtotal)}</dd>
          </div>
          <AnimatePresence initial={false}>
            {totals.paymentDiscount > 0 && (
              <motion.div
                key="transfer-discount"
                className="order-summary__row order-summary__row--discount"
                initial={ROW_HIDDEN}
                animate={ROW_SHOWN}
                exit={ROW_HIDDEN}
                transition={reduceMotion ? { duration: 0 } : ROW_TRANSITION}
              >
                <dt>Descuento por transferencia</dt>
                <dd>
                  <span aria-hidden="true">−</span>
                  <span className="sr-only">menos </span>
                  <AnimatedAmount value={totals.paymentDiscount} />
                </dd>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="order-summary__row">
            <dt>Envío</dt>
            <dd className={totals.shippingCost === 0 ? 'order-summary__free' : undefined}>
              {totals.shippingCost === 0 ? 'Gratis' : `$${formatAmount(totals.shippingCost)}`}
            </dd>
          </div>
          <div className="order-summary__row order-summary__row--total">
            <dt>Total</dt>
            <dd><AnimatedAmount value={totals.grandTotal} /></dd>
          </div>
        </dl>
      </div>
    </section>
  );
};

export default OrderSummaryCard;
