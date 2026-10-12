import { useEffect, useRef } from 'react';

/**
 * Llama a `onRestore` cuando el navegador restaura la página desde el bfcache (Atrás desde
 * Mercado Pago en Safari/Firefox): en ese caso React NO vuelve a montar nada y el estado
 * queda congelado tal como estaba al salir (p. ej. "Redirigiendo a Mercado Pago...").
 */
export const usePageRestore = (onRestore: () => void): void => {
  const callbackRef = useRef(onRestore);

  useEffect(() => {
    callbackRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) callbackRef.current();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);
};
