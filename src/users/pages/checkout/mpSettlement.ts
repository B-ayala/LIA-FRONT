import { useCartStore } from '../../../store/cartStore';
import type { MpCancelOutcome } from '../../../services/orderService';
import { forgetMpPendingPurchase, getPurchasedProductIds, type LastOrder } from './mpPendingPurchase';

/**
 * Saca del carrito SOLO lo que se compró (nunca vacía el carrito entero): el usuario pudo
 * haber agregado otros productos mientras pagaba, o abrir el resultado en otro momento.
 * Sin detalle de la compra (recarga, compra previa a este cambio) no se toca nada.
 */
export const settlePurchasedCart = (lastOrder: LastOrder | null): void => {
  if (!lastOrder) return;
  const productIds = new Set(getPurchasedProductIds(lastOrder));
  if (productIds.size === 0) return;

  const { item, items, setItem, removeItem } = useCartStore.getState();

  if (lastOrder.source === 'direct') {
    if (item?.source === 'direct' && productIds.has(String(item.product.id))) setItem(null);
    return;
  }

  items
    .filter((cartItem) => productIds.has(String(cartItem.product.id)))
    .forEach((cartItem) => removeItem(cartItem.product.id));
};

/**
 * Tope de espera en la UI para la respuesta de `mp-cancel`: un poco más que el timeout del
 * request, así nunca queda un "Liberando tu reserva…" para siempre.
 */
export const RELEASE_UI_TIMEOUT_MS = 15_000;

/**
 * Efectos locales del resultado de liberar una compra de MP: `released` y `paid` la dan por
 * resuelta (y `paid` además saca del carrito lo comprado); `held`/`error` la conservan para
 * volver a consultar más tarde.
 */
export const applyMpCancelOutcome = (outcome: MpCancelOutcome, lastOrder: LastOrder | null): void => {
  if (outcome === 'paid') settlePurchasedCart(lastOrder);
  if (outcome === 'released' || outcome === 'paid') forgetMpPendingPurchase();
};
