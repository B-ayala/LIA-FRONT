import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore, type CheckoutItem, type UnitVariants } from '../../../../store/cartStore';
import { getProductStockLimit, sanitizeProductVariants } from '../../../../utils/productVariants';
import PurchaseVariantModal from '../../../components/PurchaseVariantModal/PurchaseVariantModal';
import CheckoutNotice from './CheckoutNotice';
import type { CheckoutFlowState } from '../hooks/useCheckoutFlow';
import './CheckoutItemIssues.css';

interface IssueLine {
  item: CheckoutItem;
  message: string;
  unavailable: boolean;
}

const collectIssueLines = (flow: CheckoutFlowState): IssueLine[] => {
  const { stockError } = flow.pay;
  return flow.items.flatMap((item): IssueLine[] => {
    const productId = String(item.product.id);
    const issue = flow.freshness.issues[productId];
    // El mensaje del backend (contrato C2) ya viene en lenguaje humano y es el más preciso.
    const backendMessage = stockError?.productId === productId ? stockError.message : null;
    if (!issue && !backendMessage) return [];
    return [{ item, message: backendMessage ?? issue?.message ?? '', unavailable: issue?.unavailable ?? false }];
  });
};

const hasVariants = (item: CheckoutItem): boolean => (sanitizeProductVariants(item.product.variants)?.length ?? 0) > 0;

// Con menos stock que la cantidad pedida el modal no podría armar una selección válida.
const selectableQuantity = (item: CheckoutItem): number =>
  Math.max(1, Math.min(item.quantity, getProductStockLimit(item.product)));

interface IssueActionsProps {
  line: IssueLine;
  isDirectPurchase: boolean;
  onChangeSize: (item: CheckoutItem) => void;
}

const IssueActions = ({ line, isDirectPurchase, onChangeSize }: IssueActionsProps) => {
  const removeItem = useCartStore((s) => s.removeItem);
  const { item, unavailable } = line;
  return (
    <div className="checkout-issues__actions">
      {!unavailable && hasVariants(item) && (
        <button type="button" className="checkout-notice__action" onClick={() => onChangeSize(item)}>
          Cambiar talle
        </button>
      )}
      {isDirectPurchase ? (
        <Link to={`/product/${item.product.id}`} className="checkout-notice__action">Ver producto</Link>
      ) : (
        <button type="button" className="checkout-notice__action" onClick={() => removeItem(item.product.id)}>
          Quitar del carrito
        </button>
      )}
    </div>
  );
};

/** Líneas del pedido que no se pueden comprar tal como están, con la salida concreta para cada una. */
const CheckoutItemIssues = ({ flow }: { flow: CheckoutFlowState }) => {
  const [editing, setEditing] = useState<CheckoutItem | null>(null);
  const replaceItemUnits = useCartStore((s) => s.replaceItemUnits);
  const setItem = useCartStore((s) => s.setItem);
  const lines = collectIssueLines(flow);

  if (lines.length === 0) return null;

  const confirmSize = (unitVariants: UnitVariants[]) => {
    if (!editing) return;
    if (flow.isDirectPurchase) {
      setItem({ ...editing, quantity: unitVariants.length, unitVariants });
    } else {
      replaceItemUnits(editing.product.id, unitVariants);
    }
    setEditing(null);
  };

  return (
    <>
      <CheckoutNotice tone="danger" role="alert" title="Hay productos que no podemos venderte así">
        <ul className="checkout-issues">
          {lines.map((line) => (
            <li key={String(line.item.product.id)} className="checkout-issues__item">
              <p className="checkout-issues__name">{line.item.product.name}</p>
              <p>{line.message}</p>
              <IssueActions line={line} isDirectPurchase={flow.isDirectPurchase} onChangeSize={setEditing} />
            </li>
          ))}
        </ul>
      </CheckoutNotice>
      {editing && (
        <PurchaseVariantModal
          isOpen
          onClose={() => setEditing(null)}
          onConfirm={confirmSize}
          product={editing.product}
          quantity={selectableQuantity(editing)}
          initialVariants={editing.unitVariants[0] ?? {}}
          initialUnitVariants={editing.unitVariants.slice(0, selectableQuantity(editing))}
        />
      )}
    </>
  );
};

export default CheckoutItemIssues;
