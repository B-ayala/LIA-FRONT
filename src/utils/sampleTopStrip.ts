import { buildCloudinaryUrl } from './cloudinary';
import { averageRgb, type Rgb } from './navbarColor';

// El navbar ocupa aproximadamente el 14% superior del carrusel.
const STRIP_RATIO = 0.14;
const SAMPLE_WIDTH = 200;
const LOAD_TIMEOUT_MS = 10000;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS);
    // Sin `crossOrigin` el canvas queda "contaminado" y no se pueden leer píxeles.
    image.crossOrigin = 'anonymous';
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => { clearTimeout(timer); reject(new Error('load')); };
    image.src = url;
  });
}

// Color promedio de la franja donde queda el navbar. Devuelve null si la imagen
// no se puede leer (CORS, red): quien llama cae a elección manual.
export async function sampleTopStripColor(url: string): Promise<Rgb | null> {
  try {
    const image = await loadImage(buildCloudinaryUrl(url, { width: SAMPLE_WIDTH, crop: 'limit' }));
    const width = image.naturalWidth;
    const height = Math.max(1, Math.round(image.naturalHeight * STRIP_RATIO));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(image, 0, 0, width, height, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    const pixels: Rgb[] = [];
    for (let i = 0; i < data.length; i += 4) {
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    return averageRgb(pixels);
  } catch {
    return null;
  }
}
