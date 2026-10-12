export const NETWORK_ERROR_MESSAGE = 'No pudimos conectarnos. Revisá tu conexión y reintentá.';

const NETWORK_ABORT_NAMES = new Set(['AbortError', 'TimeoutError']);

/**
 * `fetch` rechaza con `TypeError` cuando no hay red / CORS ("Failed to fetch", "Load failed"
 * en Safari) y con `AbortError`/`TimeoutError` cuando vence un `AbortSignal.timeout`.
 * Ninguno de esos textos sirve de cara al usuario.
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof TypeError) return true;
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return NETWORK_ABORT_NAMES.has(error.name);
  }
  return error instanceof Error && NETWORK_ABORT_NAMES.has(error.name);
};

/**
 * Extrae el mensaje de un error desconocido (catch blocks).
 * Reemplaza el patrón repetido: err instanceof Error ? err.message : 'fallback'
 * Los errores de red/timeout se traducen a un mensaje humano.
 */
export const extractErrorMessage = (error: unknown, fallback = 'Error desconocido'): string => {
  if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error;
  return fallback;
};
