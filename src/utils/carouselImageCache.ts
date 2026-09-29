import type { CarouselLayout } from '../services/productService';

// Pista local (por dispositivo) de cuál fue la primera imagen de portada la
// última vez que este browser cargó el Home. Sirve solo para arrancar una
// descarga especulativa en paralelo con el fetch real a Supabase — nunca se
// usa para decidir qué mostrar. Si el admin cambió el carrusel, la pista
// queda desactualizada y la descarga especulativa se descarta sin efecto
// visible: el flujo real (fetch → imagen confirmada) no cambia en nada.
interface CachedFirstImage {
  url: string;
  layout: CarouselLayout;
  // Cuántas imágenes compartían el primer slide la última vez — determina el
  // ancho exacto que Cloudinary sirve (viewportWidth / imageCount). Sin esto,
  // adivinar el máximo teórico del layout falla cuando el último grupo tiene
  // menos imágenes que el resto, y la URL especulativa no coincide con la real.
  imageCount: number;
}

const CACHE_KEY_PREFIX = 'lia.carouselFirstImage.v1.';

export const readCachedFirstImage = (deviceType: 'desktop' | 'mobile'): CachedFirstImage | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + deviceType);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.url === 'string'
      && (parsed.layout === 'single' || parsed.layout === 'collage')
      && Number.isInteger(parsed.imageCount)
      && parsed.imageCount > 0
    ) {
      return parsed as CachedFirstImage;
    }
    return null;
  } catch {
    return null;
  }
};

export const writeCachedFirstImage = (deviceType: 'desktop' | 'mobile', value: CachedFirstImage): void => {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + deviceType, JSON.stringify(value));
  } catch {
    // Storage lleno o deshabilitado (modo privado, etc.) — la próxima visita
    // simplemente no tiene pista y sigue el flujo normal sin precarga.
  }
};
