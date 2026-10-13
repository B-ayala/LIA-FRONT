import { buildCloudinaryUrl } from './cloudinary';

export interface CarouselViewport {
  width: number;
  height: number;
}

// Cuánto pedirle de más a Cloudinary para que se vea nítido en pantallas
// retina/4K (si no, el navegador estira la imagen y se ve borrosa).
const MAX_DPR = 2;

// Cloudinary genera y cachea en su CDN una versión por cada combinación
// distinta de w/h. Con el tamaño exacto del viewport cada visitante (y cada
// vez que la barra del navegador móvil se encoge) pide una transformación
// nueva: sin caché, lenta y facturable. Redondeando a estos escalones, miles
// de visitantes comparten unas pocas versiones ya calientes en el CDN.
const WIDTH_BUCKETS = [320, 480, 640, 768, 960, 1280, 1600, 1920] as const;
const HEIGHT_BUCKETS = [480, 640, 800, 1024, 1280, 1600, 2000] as const;

const SLOW_CONNECTION_TYPES = new Set(['slow-2g', '2g', '3g']);
const SLOW_CONNECTION_QUALITY = 60;

interface NetworkInformationLike {
  effectiveType?: string;
  saveData?: boolean;
}

// Se evalúa una sola vez: si cambiara a mitad de sesión, la URL de la imagen
// en pantalla cambiaría y se volvería a descargar sin motivo.
const IS_SLOW_CONNECTION = ((): boolean => {
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  return Boolean(connection?.saveData) || SLOW_CONNECTION_TYPES.has(connection?.effectiveType ?? '');
})();

const roundUpToBucket = (value: number, buckets: readonly number[]): number =>
  buckets.find((bucket) => bucket >= value) ?? buckets[buckets.length - 1];

export const roundUpToWidthBucket = (value: number): number => roundUpToBucket(value, WIDTH_BUCKETS);

// `imageCount` es la cantidad de imágenes que realmente comparten el slide
// (el último grupo puede tener menos que el máximo por dispositivo), ya que
// cada una ocupa 1/imageCount del ancho vía flexbox.
export function buildCarouselImageUrl(url: string, viewport: CarouselViewport, imageCount: number): string {
  const dpr = IS_SLOW_CONNECTION ? 1 : Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const slotWidth = (viewport.width / Math.max(imageCount, 1)) * dpr;

  return buildCloudinaryUrl(url, {
    width: roundUpToBucket(Math.round(slotWidth), WIDTH_BUCKETS),
    height: roundUpToBucket(Math.round(viewport.height * dpr), HEIGHT_BUCKETS),
    quality: IS_SLOW_CONNECTION ? SLOW_CONNECTION_QUALITY : 'auto',
    format: 'auto',
    gravity: 'auto',
  });
}
