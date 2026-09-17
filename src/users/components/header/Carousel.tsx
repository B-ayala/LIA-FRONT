import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { fetchCarouselImages } from '../../../services/productService';
import { buildCloudinaryUrl } from '../../../utils/cloudinary';
import logoImg from '../../../assets/img/logo.jpeg';
import './Carousel.css';

interface Slide {
  images: string[];
}

interface CarouselProps {
  onReady?: () => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
};

// Alto real del carrusel según los breakpoints definidos en Carousel.css
// (viewport menos el header, que cambia de tamaño en cada breakpoint).
function getCarouselHeight(width: number): number {
  if (width <= 768) return window.innerHeight - 75;
  if (width <= 1024) return window.innerHeight - 85;
  return window.innerHeight - 95;
}

function getSlotSize(): { width: number; height: number } {
  const viewportWidth = window.innerWidth;
  const imgsPerSlide = viewportWidth <= 768 ? 2 : 3;
  return {
    width: Math.round(viewportWidth / imgsPerSlide),
    height: Math.round(getCarouselHeight(viewportWidth))
  };
}

const Carousel = ({ onReady }: CarouselProps) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [slotSize, setSlotSize] = useState(() => getSlotSize());
  const hasReportedReady = useRef(false);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const notifyReady = useCallback(() => {
    if (hasReportedReady.current) {
      return;
    }

    hasReportedReady.current = true;
    onReadyRef.current?.();
  }, []);

  // Detect mobile/desktop based on window width, y recalcula el tamaño real
  // de cada slot para pedirle a Cloudinary un recorte que coincida con esas
  // dimensiones (evita que el crop del navegador corte caras/cabezas al azar
  // cuando la foto subida no matchea el marco).
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setSlotSize(getSlotSize());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch carousel images and group them based on device type
  useEffect(() => {
    const deviceType = isMobile ? 'mobile' : 'desktop';
    const imgsPerSlide = isMobile ? 2 : 3;
    let cancelled = false;
    hasReportedReady.current = false;
    setIsLoading(true);
    setHasError(false);
    setImagesLoaded(false);

    fetchCarouselImages(deviceType)
      .then(images => {
        if (cancelled) return;

        const grouped: Slide[] = [];
        for (let i = 0; i < images.length; i += imgsPerSlide) {
          grouped.push({ images: images.slice(i, i + imgsPerSlide).map(img => img.url) });
        }
        setSlides(grouped);
        setCurrentSlide(0);
        if (grouped.length === 0) {
          // No hay imágenes cargadas para este dispositivo: no es un estado de carga, es vacío.
          setImagesLoaded(true);
          notifyReady();
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setSlides([]);
        setHasError(true);
        setImagesLoaded(true);
        notifyReady();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isMobile, notifyReady]);

  useEffect(() => {
    if (slides.length === 0) {
      return;
    }

    const firstImg = slides[0]?.images[0];
    if (!firstImg) {
      setImagesLoaded(true);
      notifyReady();
      return;
    }

    const optimizedUrl = buildCloudinaryUrl(firstImg, {
      width: slotSize.width,
      height: slotSize.height,
      quality: 'auto',
      format: 'auto',
      gravity: 'auto'
    });

    const image = new Image();
    image.src = optimizedUrl;

    if (image.complete) {
      setImagesLoaded(true);
      notifyReady();
      return;
    }

    const handleLoad = () => { setImagesLoaded(true); notifyReady(); };
    image.onload = handleLoad;
    image.onerror = handleLoad;

    return () => {
      image.onload = null;
      image.onerror = null;
      image.src = '';
    };
  }, [slides, notifyReady]);

  const nextSlide = () => {
    setDirection(1);
    setCurrentSlide(prev => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [currentSlide, slides.length]);

  if (isLoading || (slides.length > 0 && !imagesLoaded)) {
    return (
      <div className="carousel carousel--skeleton" role="status" aria-live="polite" aria-label="Cargando carrusel">
        <span className="carousel-pulse-dot" aria-hidden="true" />
      </div>
    );
  }

  if (hasError || slides.length === 0) {
    return (
      <div className="carousel carousel--empty" role="status" aria-label="Sin imágenes de portada">
        <img src={logoImg} alt="LIA" className="carousel-empty__logo" />
      </div>
    );
  }

  return (
    <div className="carousel">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentSlide}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.5 }
          }}
          className="carousel-slide"
        >
          <div className="carousel-images-container">
            {slides[currentSlide].images.map((img, idx) => (
              <img
                key={idx}
                src={buildCloudinaryUrl(img, {
                  width: slotSize.width,
                  height: slotSize.height,
                  quality: 'auto',
                  format: 'auto',
                  gravity: 'auto'
                })}
                alt=""
                className="carousel-image"
                fetchPriority={idx === 0 && currentSlide === 0 ? 'high' : 'low'}
                loading={idx === 0 && currentSlide === 0 ? 'eager' : 'lazy'}
                decoding={idx === 0 && currentSlide === 0 ? 'sync' : 'async'}
              />
            ))}
            <div className="carousel-overlay" />
          </div>
        </motion.div>
      </AnimatePresence>

      <button className="carousel-arrow carousel-arrow-left" onClick={prevSlide} aria-label="Anterior">
        <FiChevronLeft />
      </button>
      <button className="carousel-arrow carousel-arrow-right" onClick={nextSlide} aria-label="Siguiente">
        <FiChevronRight />
      </button>

      <div className="carousel-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Ir al slide ${index + 1}`}
            aria-current={index === currentSlide ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
