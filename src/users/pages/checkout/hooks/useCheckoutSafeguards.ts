import { useCallback, useEffect, useRef } from 'react';

interface IdempotencyKey {
  /** Misma key mientras no cambie la huella del pedido (reintentos, timeouts, doble click). */
  get: (fingerprint: string) => string;
  /** Fuerza una key nueva en el próximo intento (la compra anterior se liberó). */
  reset: () => void;
}

export const useIdempotencyKey = (): IdempotencyKey => {
  const ref = useRef<{ fingerprint: string; key: string } | null>(null);

  const get = useCallback((fingerprint: string) => {
    if (ref.current?.fingerprint !== fingerprint) {
      ref.current = { fingerprint, key: crypto.randomUUID() };
    }
    return ref.current.key;
  }, []);

  const reset = useCallback(() => {
    ref.current = null;
  }, []);

  return { get, reset };
};

interface Watchdog {
  arm: () => void;
  clear: () => void;
}

/** Timer de seguridad: si tras `ms` seguimos acá (la redirección no ocurrió), ejecuta `onTimeout`. */
export const useWatchdog = (ms: number, onTimeout: () => void): Watchdog => {
  const timerRef = useRef<number | null>(null);
  const callbackRef = useRef(onTimeout);

  useEffect(() => {
    callbackRef.current = onTimeout;
  }, [onTimeout]);

  const clear = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const arm = useCallback(() => {
    clear();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      callbackRef.current();
    }, ms);
  }, [clear, ms]);

  useEffect(() => clear, [clear]);

  return { arm, clear };
};
