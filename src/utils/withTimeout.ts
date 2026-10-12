const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Failsafe para promesas de red que pueden quedar colgadas para siempre (fetch
 * sin respuesta, request bloqueado por una extensión del navegador, etc.).
 * Sin esto, un `try/catch/finally` nunca llega a correr porque la promesa
 * jamás resuelve ni rechaza, y la UI queda en loading indefinidamente.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

/**
 * `AbortSignal` que se aborta solo tras `timeoutMs`. Usa `AbortSignal.timeout` si existe
 * (Safari < 16 no lo tiene: llamarlo ahí tiraría TypeError y rompería la request).
 */
export const timeoutSignal = (timeoutMs: number): AbortSignal => {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(timeoutMs);
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('Tiempo de espera agotado', 'TimeoutError')), timeoutMs);
  return controller.signal;
};
