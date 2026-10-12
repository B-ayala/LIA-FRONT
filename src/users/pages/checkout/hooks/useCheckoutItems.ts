import { useMemo } from 'react';
import { useCartStore } from '../../../../store/cartStore';
import type { CheckoutItem } from '../../../../store/cartStore';
import { getProductPricing, roundToCents } from '../../../../utils/pricing';

interface CheckoutItemsState {
  items: CheckoutItem[];
  isDirectPurchase: boolean;
}

/** Ítems a pagar: la compra directa tiene prioridad sobre el carrito (mismo criterio que antes). */
export const useCheckoutItems = (): CheckoutItemsState => {
  const cartItems = useCartStore((s) => s.items);
  const item = useCartStore((s) => s.item);

  return useMemo(() => {
    if (item?.source === 'direct') {
      return { items: [item], isDirectPurchase: true };
    }

    const items = cartItems.map((cartItem): CheckoutItem => {
      const unitPrice = getProductPricing(cartItem.product).finalPrice;
      return {
        product: cartItem.product,
        quantity: cartItem.quantity,
        unitVariants: cartItem.unitVariants,
        unitPrice,
        totalPrice: roundToCents(unitPrice * cartItem.quantity),
        source: 'cart',
      };
    });
    return { items, isDirectPurchase: false };
  }, [cartItems, item]);
};
