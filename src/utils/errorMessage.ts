/**
 * Extrae el mensaje de un error desconocido (catch blocks).
 * Reemplaza el patrón repetido: err instanceof Error ? err.message : 'fallback'
 */
export const extractErrorMessage = (error: unknown, fallback = 'Error desconocido'): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};
