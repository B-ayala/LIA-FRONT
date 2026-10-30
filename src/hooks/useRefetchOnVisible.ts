import { useEffect, useRef } from 'react';

const DEFAULT_MIN_INTERVAL_MS = 60 * 1000;

// Admin y público son pestañas distintas: lo que el admin guarda no llega solo a
// una pestaña ya abierta. Al volver a verla se revalida, pero no más seguido que
// `minIntervalMs` para no pegarle a la base cada vez que alguien cambia de pestaña.
export function useRefetchOnVisible(refetch: () => void, minIntervalMs: number = DEFAULT_MIN_INTERVAL_MS): void {
  const refetchRef = useRef(refetch);
  const lastRunRef = useRef(0);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    lastRunRef.current = Date.now();
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRunRef.current < minIntervalMs) return;
      lastRunRef.current = Date.now();
      refetchRef.current();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [minIntervalMs]);
}
