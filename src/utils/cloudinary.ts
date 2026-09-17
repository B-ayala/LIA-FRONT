/**
 * Injects Cloudinary transformation parameters into a Cloudinary URL.
 * Works only on res.cloudinary.com URLs — passes through all others unchanged.
 *
 * @param url     - Original Cloudinary URL
 * @param options - Transformation options
 */
export function buildCloudinaryUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'avif';
    crop?: 'fill' | 'fit' | 'limit';
    gravity?: 'auto' | 'face' | 'center';
  } = {}
): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  const { width, height, quality = 'auto', format = 'auto', crop = 'fill', gravity } = options;

  const transforms: string[] = [];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  transforms.push(`c_${crop}`);
  // La gravedad solo tiene efecto cuando el crop realmente recorta (fill con w y h);
  // sin ambas dimensiones, Cloudinary solo escala y no hay nada que recortar.
  if (gravity && crop === 'fill' && width && height) transforms.push(`g_${gravity}`);
  transforms.push(`f_${format}`);
  transforms.push(`q_${quality}`);

  const transformString = transforms.join(',');

  // Insert after /upload/ in the URL
  return url.replace('/upload/', `/upload/${transformString}/`);
}

const PLACEHOLDER_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">` +
  `<rect width="400" height="400" fill="#f1f5f9"/>` +
  `<text x="200" y="208" font-family="sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">Sin imagen</text>` +
  `</svg>`;

/** Placeholder neutro (sin red) para productos sin imagen. */
export const PRODUCT_IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

/**
 * Devuelve la URL de imagen del producto lista para `<img src>`, o un placeholder
 * cuando no hay imagen. Evita renderizar `src=""` (que dispara un warning de React
 * y una re-descarga de la página).
 */
export function productImageSrc(
  image: string | null | undefined,
  options: Parameters<typeof buildCloudinaryUrl>[1] = {}
): string {
  return buildCloudinaryUrl(image ?? '', options) || PRODUCT_IMAGE_PLACEHOLDER;
}

/**
 * Extrae el public_id de una URL de entrega de Cloudinary.
 * Para `.../upload/v123/carpeta/imagen.jpg` devuelve `carpeta/imagen`
 * (conserva la carpeta, descarta versión, transformaciones y extensión).
 */
export function extractCloudinaryPublicId(url: string): string {
  if (!url) return '';

  const cleanUrl = url.split('?')[0].split('#')[0];
  const uploadIndex = cleanUrl.indexOf('/upload/');

  if (uploadIndex === -1) {
    const last = cleanUrl.split('/').pop() ?? '';
    return last.replace(/\.[^./]+$/, '');
  }

  const segments = cleanUrl.slice(uploadIndex + '/upload/'.length).split('/');

  // Descarta transformaciones ("w_500,q_auto") y el prefijo de versión ("v123...")
  while (segments.length > 1 && (segments[0].includes(',') || /^v\d+$/.test(segments[0]))) {
    segments.shift();
  }

  const fileName = (segments.pop() ?? '').replace(/\.[^./]+$/, '');
  return [...segments, fileName].join('/');
}
