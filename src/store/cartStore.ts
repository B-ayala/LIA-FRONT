import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types/product';
import { getProductPricing } from '../utils/pricing';
import { areUnitVariantSelectionsValid, getProductStockLimit } from '../utils/productVariants';

export type UnitVariants = { [key: string]: string };
export type CheckoutItemSource = 'cart' | 'direct';

export interface CartItem {
  product: Product;
  quantity: number;
  unitVariants: UnitVariants[];
}

export interface CheckoutItem {
  product: Product;
  quantity: number;
  unitVariants: UnitVariants[];
  unitPrice: number;
  totalPrice: number;
  source?: CheckoutItemSource;
}

interface CartState {
  items: CartItem[];
  item: CheckoutItem | null;
  addItem: (product: Product, qty?: number, unitVariants?: UnitVariants[]) => void;
  removeItem: (productId: string | number) => void;
  updateQuantity: (productId: string | number, delta: number) => void;
  setUnitVariants: (productId: string | number, unitVariants: UnitVariants[]) => void;
  replaceItemUnits: (productId: string | number, unitVariants: UnitVariants[]) => void;
  clearCart: () => void;
  totalItems: () => number;
  setItem: (item: CheckoutItem | null) => void;
}

const clampQuantityToStock = (quantity: number, product: Product): number => {
  const safeQuantity = Math.max(0, quantity);

  return Math.min(safeQuantity, getProductStockLimit(product));
};

const buildUnitVariants = (qty: number, unitVariants?: UnitVariants[]): UnitVariants[] => {
  if (unitVariants && unitVariants.length > 0) {
    return unitVariants.slice(0, qty).map((variants) => ({ ...variants }));
  }

  return Array.from({ length: qty }, () => ({}));
};

const sanitizeCartItem = (cartItem: CartItem): CartItem | null => {
  const quantity = clampQuantityToStock(cartItem.quantity, cartItem.product);

  if (quantity <= 0) {
    return null;
  }

  const unitVariants = buildUnitVariants(quantity, cartItem.unitVariants);

  if (!areUnitVariantSelectionsValid(cartItem.product, unitVariants)) {
    return null;
  }

  return {
    ...cartItem,
    quantity,
    unitVariants,
  };
};

const sanitizeCartItems = (items: CartItem[]): CartItem[] =>
  items
    .map((item) => sanitizeCartItem(item))
    .filter((item): item is CartItem => item !== null);

const sanitizeCheckoutItem = (item: CheckoutItem | null): CheckoutItem | null => {
  if (!item) {
    return null;
  }

  const quantity = clampQuantityToStock(item.quantity, item.product);

  if (quantity <= 0) {
    return null;
  }

  const unitVariants = buildUnitVariants(quantity, item.unitVariants);

  if (!areUnitVariantSelectionsValid(item.product, unitVariants)) {
    return null;
  }

  const { finalPrice } = getProductPricing(item.product);

  return {
    ...item,
    quantity,
    unitVariants,
    unitPrice: finalPrice,
    totalPrice: finalPrice * quantity,
  };
};

const buildCheckoutItemFromCartItem = (cartItem: CartItem): CheckoutItem => {
  const { finalPrice } = getProductPricing(cartItem.product);

  return {
    product: cartItem.product,
    quantity: cartItem.quantity,
    unitVariants: cartItem.unitVariants,
    unitPrice: finalPrice,
    totalPrice: finalPrice * cartItem.quantity,
    source: 'cart',
  };
};

const syncCheckoutItemWithCart = (cartItems: CartItem[], currentItem: CheckoutItem | null) => {
  if (!currentItem || currentItem.source === 'direct') {
    return currentItem;
  }

  if (cartItems.length !== 1) {
    return null;
  }

  return buildCheckoutItemFromCartItem(cartItems[0]);
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      item: null,

      setItem: (item) => set({ item: sanitizeCheckoutItem(item) }),

      addItem: (product, qty = 1, unitVariants) =>
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          const requestedQuantity = Math.max(0, qty);
          const availableQuantity = Math.max(0, getProductStockLimit(product) - (existing?.quantity ?? 0));
          const quantityToAdd = Math.min(requestedQuantity, availableQuantity);

          if (quantityToAdd === 0) {
            return state;
          }

          const nextVariants = buildUnitVariants(quantityToAdd, unitVariants);

          if (!areUnitVariantSelectionsValid(product, nextVariants)) {
            return state;
          }

          const existingUnitVariants = existing?.unitVariants ?? [];
          if (!areUnitVariantSelectionsValid(product, [...existingUnitVariants, ...nextVariants])) {
            return state;
          }

          const items = existing
            ? state.items.map((i) =>
                i.product.id === product.id
                  ? {
                      ...i,
                      quantity: i.quantity + quantityToAdd,
                      unitVariants: [...i.unitVariants, ...nextVariants],
                    }
                  : i
              )
            : [...state.items, { product, quantity: quantityToAdd, unitVariants: nextVariants }];

          return {
            items,
            item: syncCheckoutItemWithCart(items, state.item),
          };
        }),

      removeItem: (productId) =>
        set((state) => {
          const items = state.items.filter((i) => i.product.id !== productId);

          return {
            items,
            item: syncCheckoutItemWithCart(items, state.item),
          };
        }),

      updateQuantity: (productId, delta) =>
        set((state) => {
          const items = state.items
            .map((i) => {
              if (i.product.id !== productId) {
                return i;
              }

              const nextQuantity = clampQuantityToStock(i.quantity + delta, i.product);

              if (nextQuantity === i.quantity) {
                return i;
              }

              if (nextQuantity <= 0) {
                return { ...i, quantity: nextQuantity };
              }

              if (delta > 0) {
                const fallbackVariants = i.unitVariants[i.unitVariants.length - 1] ?? {};
                const extraVariants = Array.from({ length: nextQuantity - i.quantity }, () => ({ ...fallbackVariants }));
                const nextUnitVariants = [...i.unitVariants, ...extraVariants];

                if (!areUnitVariantSelectionsValid(i.product, nextUnitVariants)) {
                  return i;
                }

                return {
                  ...i,
                  quantity: nextQuantity,
                  unitVariants: nextUnitVariants,
                };
              }

              return {
                ...i,
                quantity: nextQuantity,
                unitVariants: i.unitVariants.slice(0, nextQuantity),
              };
            })
            .filter((i) => i.quantity > 0);

          return {
            items,
            item: syncCheckoutItemWithCart(items, state.item),
          };
        }),

      setUnitVariants: (productId, unitVariants) =>
        set((state) => {
          const items = state.items.map((cartItem) => {
            if (cartItem.product.id !== productId) {
              return cartItem;
            }

            const nextUnitVariants = buildUnitVariants(cartItem.quantity, unitVariants);

            if (!areUnitVariantSelectionsValid(cartItem.product, nextUnitVariants)) {
              return cartItem;
            }

            return {
              ...cartItem,
              unitVariants: nextUnitVariants,
            };
          });

          return {
            items,
            item: syncCheckoutItemWithCart(items, state.item),
          };
        }),

      replaceItemUnits: (productId, unitVariants) =>
        set((state) => {
          const items = state.items
            .map((cartItem) => {
              if (cartItem.product.id !== productId) {
                return cartItem;
              }

              const nextQuantity = clampQuantityToStock(unitVariants.length, cartItem.product);

              if (nextQuantity <= 0) {
                return null;
              }

              const nextUnitVariants = buildUnitVariants(nextQuantity, unitVariants);

              if (!areUnitVariantSelectionsValid(cartItem.product, nextUnitVariants)) {
                return cartItem;
              }

              return {
                ...cartItem,
                quantity: nextQuantity,
                unitVariants: nextUnitVariants,
              };
            })
            .filter((item): item is CartItem => item !== null);

          return {
            items,
            item: syncCheckoutItemWithCart(items, state.item),
          };
        }),

      clearCart: () => set({ items: [], item: null }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'damiana-bella-cart',
      merge: (persistedState, currentState) => {
        const persistedCartState = persistedState as Partial<CartState>;
        const items = sanitizeCartItems(persistedCartState.items ?? currentState.items);
        const item = sanitizeCheckoutItem(persistedCartState.item ?? currentState.item);

        return {
          ...currentState,
          ...persistedCartState,
          items,
          item: syncCheckoutItemWithCart(items, item),
        };
      },
    }
  )
);
