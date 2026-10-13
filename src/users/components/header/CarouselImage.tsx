import { useState } from 'react';
import { isImagePreloaded } from '../../../utils/preloadImage';

interface CarouselImageProps {
  src: string;
  placeholderSrc: string;
  isPriority: boolean;
}

// Mientras la imagen real baja (en 3G puede tardar), el marco muestra una
// miniatura borrosa en vez del fondo oscuro del carrusel, y la imagen entra
// con fade al terminar. Si ya está precargada, aparece directa, sin fade.
const CarouselImage = ({ src, placeholderSrc, isPriority }: CarouselImageProps) => {
  const [isLoaded, setIsLoaded] = useState(() => isImagePreloaded(src));
  const markLoaded = () => setIsLoaded(true);

  return (
    <div className="carousel-image-frame" style={{ backgroundImage: `url("${placeholderSrc}")` }}>
      <img
        src={src}
        alt=""
        className={`carousel-image${isLoaded ? ' carousel-image--loaded' : ''}`}
        fetchPriority={isPriority ? 'high' : 'auto'}
        decoding="async"
        onLoad={markLoaded}
        onError={markLoaded}
      />
    </div>
  );
};

export default CarouselImage;
