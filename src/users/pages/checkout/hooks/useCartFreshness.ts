import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCartStore, type CheckoutItem } from '../../../../store/cartStore';
import type { Product } from '../../../../types/product';
import { fetchActiveProductsByIds } from '../../../../services/productService';
import { getProductPricing } from '../../../../utils/pricing';
import { withTimeout } from '../../../../utils/withTimeout';
import { areUnitVariantSelectionsValid, getSizeVariant } from '../../../../utils/productVariants';

export type FreshnessStatus = 'loading' | 'ready' | 'error';

export interface ItemIssue {
  productId: string;
  message: string;
  /** El producto ya no se vende: solo queda quitarlo. */
  unavailable: boolean;
}

interface FreshnessState {
  status: FreshnessStatus;
  missingIds: string[];
  repricedNames: string[];
  attempt: number;
}

export interface CartFreshness {
  status: FreshnessStatus;
  /** Problemas por id de producto (talle agotado, sin stock, producto dado de baja). */
  issues: Record<string, ItemIssue>;
  repricedNames: string[];
  refresh: () => void;
}

const FRESHNESS_TIMEOUT_MS = 8000;

const UNAVAILABLE_MESSAGE = 'Este producto ya no está disponible.';
const SIZE_MESSAGE = 'El talle elegido se agotó o ya no existe. Elegí otro o quitalo.';
const STOCK_MESSAGE = 'No hay stock suficiente para la cantidad elegida.';

const productKey = (item: CheckoutItem): string => String(item.product.id);

const finalPriceOf = (product: Product): number => getProductPricing(product).finalPrice;

const findRepricedNames = (current: Product[], fresh: Product[]): string[] => {
  const byId = new Map(fresh.map((product) => [String(product.id), product]));
  return current
    .filter((product) => {
      const freshProduct = byId.get(String(product.id));
      return freshProduct !== undefined && finalPriceOf(freshProduct) !== finalPriceOf(product);
    })
    .map((product) => product.name);
};

// Lectura en el momento de la respuesta (no del render): el carrito pudo cambiar mientras tanto.
const currentCheckoutProducts = (): Product[] => {
  const { item, items } = useCartStore.getState();
  return item?.source === 'direct' ? [item.product] : items.map((cartItem) => cartItem.product);
};

const describeIssue = (item: CheckoutItem, missingIds: Set<string>): ItemIssue | null => {
  const productId = productKey(item);
  if (missingIds.has(productId)) return { productId, message: UNAVAILABLE_MESSAGE, unavailable: true };
  if (areUnitVariantSelectionsValid(item.product, item.unitVariants)) return null;
  const tracksSizeStock = Boolean(getSizeVariant(item.product)?.stockByOption);
  return { productId, message: tracksSizeStock ? SIZE_MESSAGE : STOCK_MESSAGE, unavailable: false };
};

/**
 * Al entrar al checkout trae precio/stock/talles actuales de cada producto (sin caché) y
 * actualiza el carrito: el precio nuevo se avisa y las líneas que ya no se pueden comprar
 * quedan marcadas. Mientras carga, el pago queda bloqueado.
 */
export const useCartFreshness = (items: CheckoutItem[]): CartFreshness => {
  const [state, setState] = useState<FreshnessState>({ status: 'loading', missingIds: [], repricedNames: [], attempt: 0 });
  const idsKey = useMemo(() => [...new Set(items.map(productKey))].sort().join(','), [items]);
  const { attempt } = state;

  useEffect(() => {
    let active = true;
    const ids = idsKey ? idsKey.split(',') : [];
    const applyFresh = (fresh: Product[]) => {
      const repricedNames = findRepricedNames(currentCheckoutProducts(), fresh);
      useCartStore.getState().syncProducts(fresh);
      const found = new Set(fresh.map((product) => String(product.id)));
      setState((current) => ({
        ...current,
        status: 'ready',
        missingIds: ids.filter((id) => !found.has(id)),
        repricedNames: [...new Set([...current.repricedNames, ...repricedNames])],
      }));
    };
    // Sin datos frescos (timeout/red) el backend igual valida precio y stock al crear la orden:
    // se avisa y se deja seguir (no bloqueamos la compra por una lectura auxiliar).
    const markError = () => setState((current) => ({ ...current, status: 'error' }));
    void withTimeout(fetchActiveProductsByIds(ids), FRESHNESS_TIMEOUT_MS)
      .then((fresh) => {
        if (!active) return;
        if (fresh === null) markError();
        else applyFresh(fresh);
      })
      .catch(() => {
        if (active) markError();
      });
    return () => {
      active = false;
    };
  }, [idsKey, attempt]);

  const refresh = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading', attempt: current.attempt + 1 }));
  }, []);

  const issues = useMemo(() => {
    const missing = new Set(state.missingIds);
    return items.reduce<Record<string, ItemIssue>>((acc, item) => {
      const issue = describeIssue(item, missing);
      if (issue) acc[issue.productId] = issue;
      return acc;
    }, {});
  }, [items, state.missingIds]);

  return { status: state.status, issues, repricedNames: state.repricedNames, refresh };
};
