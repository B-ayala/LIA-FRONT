// En 3G una imagen grande puede tardar decenas de segundos; pasado este tope
// se deja de esperar (la descarga sigue en segundo plano) para no frenar el
// carrusel por una sola imagen.
const PRELOAD_TIMEOUT_MS = 20000;

const loadedUrls = new Set<string>();
const inFlight = new Map<string, Promise<void>>();

export const isImagePreloaded = (url: string): boolean => loadedUrls.has(url);

// Nunca rechaza: una imagen que falla no debe trabar a quien la espera, que
// decide qué mostrar igual (ver Carousel).
export function preloadImage(url: string): Promise<void> {
  if (loadedUrls.has(url)) {
    return Promise.resolve();
  }

  const pending = inFlight.get(url);
  if (pending) {
    return pending;
  }

  const promise = new Promise<void>((resolve) => {
    const image = new Image();

    const settle = (succeeded: boolean) => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      inFlight.delete(url);
      if (succeeded) {
        loadedUrls.add(url);
      }
      resolve();
    };

    const timer = setTimeout(() => settle(false), PRELOAD_TIMEOUT_MS);
    image.onload = () => settle(true);
    image.onerror = () => settle(false);
    image.src = url;
  });

  inFlight.set(url, promise);
  return promise;
}

export const preloadImages = (urls: string[]): Promise<void> =>
  Promise.all(urls.map(preloadImage)).then(() => undefined);
