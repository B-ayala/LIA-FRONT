import { useState } from 'react';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import { isImagePreloaded } from '../../../utils/preloadImage';

export const CAROUSEL_LOADING_LABEL = 'Preparando la mejor moda para vos';

interface CarouselSlideImagesProps {
  sources: string[];
  isFirstSlide: boolean;
}

// Mientras las imágenes del slide bajan (en 3G puede tardar), se muestra el
// loader de marca sobre un fondo claro: nunca el fondo oscuro del carrusel ni
// su degradado. Cada imagen entra con fade al terminar; si ya estaba
// precargada aparece directa, sin loader.
const CarouselSlideImages = ({ sources, isFirstSlide }: CarouselSlideImagesProps) => {
  const [loadedIndexes, setLoadedIndexes] = useState<ReadonlySet<number>>(
    () => new Set(sources.flatMap((src, index) => (isImagePreloaded(src) ? [index] : []))),
  );
  const markLoaded = (index: number) => setLoadedIndexes((previous) => new Set(previous).add(index));
  const allLoaded = loadedIndexes.size >= sources.length;

  return (
    <div className="carousel-images-container">
      {sources.map((src, index) => (
        <div className="carousel-image-frame" key={src}>
          <img
            src={src}
            alt=""
            className={`carousel-image${loadedIndexes.has(index) ? ' carousel-image--loaded' : ''}`}
            fetchPriority={isFirstSlide && index === 0 ? 'high' : 'auto'}
            decoding="async"
            onLoad={() => markLoaded(index)}
            onError={() => markLoaded(index)}
          />
        </div>
      ))}
      {allLoaded ? (
        <div className="carousel-overlay" />
      ) : (
        <div className="carousel-loading">
          <LiaLoader size="lg" variant="section" label={CAROUSEL_LOADING_LABEL} />
        </div>
      )}
    </div>
  );
};

export default CarouselSlideImages;
