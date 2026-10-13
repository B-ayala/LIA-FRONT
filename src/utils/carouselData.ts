import { fetchCarouselImages, fetchCarouselLayout, type CarouselLayout } from '../services/productService';
import { createCachedFetcher } from './createCachedFetcher';
import { withTimeout } from './withTimeout';
import type { CarouselItem } from './carouselSlides';

type DeviceType = 'desktop' | 'mobile';

export interface CarouselData {
  items: CarouselItem[];
  layout: CarouselLayout;
}

// 3G con latencia alta: el timeout anterior (8 s) daba por vacío un carrusel
// que simplemente todavía no había llegado.
const REQUEST_TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 2;
// El jitter evita que, ante un tropiezo de Supabase, todos los visitantes
// reintenten en el mismo instante y lo vuelvan a tumbar.
const RETRY_BASE_DELAY_MS = 500;
const RETRY_JITTER_MS = 1000;
// Volver al Home dentro de la sesión no repite el pedido ni el skeleton.
const CACHE_TTL_MS = 2 * 60 * 1000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchOnce(deviceType: DeviceType): Promise<CarouselData> {
  const [images, layout] = await Promise.all([
    withTimeout(fetchCarouselImages(deviceType), REQUEST_TIMEOUT_MS),
    // Si la tabla de configuración no existe todavía (script SQL sin aplicar)
    // o falla, el carrusel sigue funcionando como collage.
    withTimeout(fetchCarouselLayout(deviceType).catch((): CarouselLayout => 'collage'), REQUEST_TIMEOUT_MS),
  ]);

  if (images === null) {
    throw new Error('Tiempo de espera agotado al cargar el carrusel');
  }

  const items = images.flatMap((image): CarouselItem[] => {
    if (image.kind === 'banner') {
      return image.design ? [{ kind: 'banner', design: image.design, navbarColor: image.navbarColor }] : [];
    }
    return [{ kind: 'image', url: image.url, navbarColor: image.navbarColor }];
  });

  return { items, layout: layout ?? 'collage' };
}

async function fetchWithRetry(deviceType: DeviceType): Promise<CarouselData> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetchOnce(deviceType);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await wait(RETRY_BASE_DELAY_MS + Math.random() * RETRY_JITTER_MS);
      }
    }
  }

  throw lastError;
}

const fetchers: Record<DeviceType, ReturnType<typeof createCachedFetcher<CarouselData>>> = {
  desktop: createCachedFetcher(() => fetchWithRetry('desktop'), CACHE_TTL_MS),
  mobile: createCachedFetcher(() => fetchWithRetry('mobile'), CACHE_TTL_MS),
};

export const loadCarouselData = (deviceType: DeviceType): Promise<CarouselData> => fetchers[deviceType].load();
