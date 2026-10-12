import { useEffect } from 'react';
import { CART_STORAGE_KEY, useCartStore } from '../store/cartStore';

/**
 * Mantiene el carrito igual en todas las pestañas: el evento `storage` solo llega a las
 * OTRAS pestañas, así que no hay eco. `rehydrate` usa el `set` interno del persist (no
 * vuelve a escribir en localStorage), por lo que tampoco hay ping-pong entre pestañas.
 */
export const useCartTabSync = (): void => {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      // key null = localStorage.clear() en otra pestaña.
      if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
      if (event.newValue === null) {
        // La key se borró (clear o TTL vencido): rehidratar conservaría el carrito local.
        useCartStore.setState({ items: [], item: null });
        return;
      }
      void useCartStore.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
};
