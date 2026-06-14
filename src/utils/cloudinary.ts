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
  } = {}
): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  const { width, height, quality = 'auto', format = 'auto', crop = 'fill' } = options;

  const transforms: string[] = [];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  transforms.push(`c_${crop}`);
  transforms.push(`f_${format}`);
  transforms.push(`q_${quality}`);

  const transformString = transforms.join(',');

  // Insert after /upload/ in the URL
  return url.replace('/upload/', `/upload/${transformString}/`);
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
