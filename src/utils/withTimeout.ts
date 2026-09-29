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
