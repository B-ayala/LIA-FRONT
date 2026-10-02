type CachedFetcher<T> = {
  load: () => Promise<T>;
  invalidate: () => void;
};

// Memoiza una lectura remota por `ttlMs` y deduplica los pedidos en vuelo: si
// dos componentes montan a la vez, comparten un solo request; si uno se
// remonta dentro del TTL, no vuelve a pegarle a la red. Pensado para datos de
// configuración de baja volatilidad (categorías, opciones de card), NO para
// datos que el usuario espera ver siempre frescos.
//
// Los errores no se cachean: si el fetch falla, la próxima llamada reintenta.
// Quien muta esos datos debe llamar a `invalidate()` para no servir una
// versión vieja (ver usos en productService).
export function createCachedFetcher<T>(fetcher: () => Promise<T>, ttlMs: number): CachedFetcher<T> {
  let cached: { value: T; expiresAt: number } | null = null;
  let inFlight: Promise<T> | null = null;

  return {
    load() {
      if (cached && cached.expiresAt > Date.now()) {
        return Promise.resolve(cached.value);
      }

      if (inFlight) {
        return inFlight;
      }

      inFlight = fetcher()
        .then((value) => {
          cached = { value, expiresAt: Date.now() + ttlMs };
          return value;
        })
        .finally(() => {
          inFlight = null;
        });

      return inFlight;
    },

    invalidate() {
      cached = null;
    },
  };
}
