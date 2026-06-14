import { useEffect } from 'react';

/**
 * Hook personalizado para manejar el bloqueo del scroll del body
 * Evita la duplicación de lógica en componentes Modal
 */
export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (isLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLocked]);
};
