const RELOAD_KEY = 'lia:stale-chunk-reload-at';
// Evita un bucle de recargas si el error no se debe a un deploy sino a un problema real.
const MIN_RELOAD_GAP_MS = 10 * 1000;

const STALE_CHUNK_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

export const isStaleChunkError = (error: unknown): boolean =>
  error instanceof Error && STALE_CHUNK_PATTERN.test(error.message);

/** Recarga la página una sola vez en la ventana; devuelve false si no recargó (ya lo hizo hace poco). */
export const reloadOnceForNewVersion = (): boolean => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < MIN_RELOAD_GAP_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Sin sessionStorage no hay forma de frenar un bucle: se prefiere mostrar el error.
    return false;
  }
  window.location.reload();
  return true;
};

// Tras un deploy los archivos con hash viejo ya no existen: recargar trae el index nuevo.
export const watchStaleChunks = (): void => {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnceForNewVersion();
  });
};
