import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import type { CarouselLayout } from '../../../services/productService';
import { loadCarouselData } from '../../../utils/carouselData';
import { buildCarouselImageUrl, buildCarouselPlaceholderUrl, type CarouselViewport } from '../../../utils/carouselImageUrl';
import { readCachedFirstImage, writeCachedFirstImage } from '../../../utils/carouselImageCache';
import { preloadImage, preloadImages } from '../../../utils/preloadImage';
import CarouselImage from './CarouselImage';
import logoImg from '../../../assets/img/logo.jpeg';
import './Carousel.css';

interface Slide {
  images: string[];
}

type DeviceType = 'desktop' | 'mobile';

interface LoadedCarousel {
  deviceType: DeviceType;
  slides: Slide[];
  layout: CarouselLayout;
  hasError: boolean;
}

const NO_SLIDES: Slide[] = [];
const MOBILE_MAX_WIDTH = 768;
const AUTOPLAY_INTERVAL_MS = 5000;
const IMAGES_PER_SLIDE = { single: 1, collageMobile: 2, collageDesktop: 3 } as const;

// Transición de empuje puro, sin fade. Dos razones, las dos sobre no dejar ver
// el fondo del contenedor (que toma el color del tema del admin):
// el offset es 100% del ancho del slide y no un valor fijo en px, para que el
// que entra y el que sale queden pegados en vez de separados por una franja; y
// no se anima la opacidad, porque un slide semitransparente deja pasar ese
// mismo fondo durante el cruce.
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%'
  }),
  center: {
    x: 0
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%'
  })
};

const readViewport = (): CarouselViewport => ({ width: window.innerWidth, height: window.innerHeight });

function groupIntoSlides(imageUrls: string[], layout: CarouselLayout, isMobile: boolean): Slide[] {
  let imagesPerSlide: number = IMAGES_PER_SLIDE.collageDesktop;
  if (layout === 'single') {
    imagesPerSlide = IMAGES_PER_SLIDE.single;
  } else if (isMobile) {
    imagesPerSlide = IMAGES_PER_SLIDE.collageMobile;
  }

  const slides: Slide[] = [];
  for (let i = 0; i < imageUrls.length; i += imagesPerSlide) {
    slides.push({ images: imageUrls.slice(i, i + imagesPerSlide) });
  }
  return slides;
}

const getSlideImageUrls = (slide: Slide, viewport: CarouselViewport): string[] =>
  slide.images.map((url) => buildCarouselImageUrl(url, viewport, slide.images.length));

const Carousel = () => {
  const [loaded, setLoaded] = useState<LoadedCarousel | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_MAX_WIDTH);
  const [viewport, setViewport] = useState<CarouselViewport>(readViewport);
  const deviceType: DeviceType = isMobile ? 'mobile' : 'desktop';
  // El resultado queda atado al dispositivo con el que se pidió: al cruzar el
  // breakpoint se vuelve a mostrar el skeleton hasta que llegue el del nuevo.
  const isLoading = loaded === null || loaded.deviceType !== deviceType;
  const slides = isLoading ? NO_SLIDES : loaded.slides;
  const layout = isLoading ? 'collage' : loaded.layout;
  const hasError = !isLoading && loaded.hasError;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_MAX_WIDTH);
      // Solo cuenta un cambio de ancho (rotación, redimensionar): en móvil la
      // barra del navegador cambia el alto al scrollear, y eso no debe
      // cambiar las URLs de las imágenes ya en pantalla.
      setViewport((previous) => (previous.width === window.innerWidth ? previous : readViewport()));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Precarga especulativa: si la visita anterior dejó registrada cuál era la
  // primera imagen de portada para este dispositivo, arrancamos su descarga ya
  // mismo, en paralelo con el fetch de abajo. Si el admin cambió el carrusel,
  // esa descarga de más se descarta sola, sin ningún efecto visible.
  useEffect(() => {
    const hint = readCachedFirstImage(deviceType);
    if (hint) {
      void preloadImage(buildCarouselImageUrl(hint.url, viewport, hint.imageCount));
    }
  }, [deviceType, viewport]);

  useEffect(() => {
    let cancelled = false;

    loadCarouselData(deviceType)
      .then(({ imageUrls, layout: loadedLayout }) => {
        if (cancelled) return;

        const grouped = groupIntoSlides(imageUrls, loadedLayout, deviceType === 'mobile');
        // Se guarda la cantidad real de imágenes del primer slide (el último
        // grupo puede tener menos que el máximo): determina el ancho exacto
        // que pide el flujo real, y la pista tiene que coincidir con él.
        if (grouped[0]) {
          writeCachedFirstImage(deviceType, {
            url: grouped[0].images[0],
            layout: loadedLayout,
            imageCount: grouped[0].images.length,
          });
        }
        setLoaded({ deviceType, slides: grouped, layout: loadedLayout, hasError: false });
        setCurrentSlide(0);
        setDirection(0);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setLoaded({ deviceType, slides: NO_SLIDES, layout: 'collage', hasError: true });
      });

    return () => {
      cancelled = true;
    };
  }, [deviceType]);

  const goToSlide = (index: number, nextDirection: number) => {
    setDirection(nextDirection);
    setCurrentSlide(index);
  };

  // El avance automático espera a que el slide actual esté bajado y a que el
  // siguiente esté precargado: sin esto el slide entra con las imágenes aún en
  // camino y deja ver el fondo oscuro del carrusel (el "negro" en 3G).
  useEffect(() => {
    if (slides.length < 2) return;

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    const nextIndex = (currentSlide + 1) % slides.length;

    preloadImages(getSlideImageUrls(slides[currentSlide], viewport))
      .then(() => Promise.all([
        new Promise<void>((resolve) => { timerId = setTimeout(resolve, AUTOPLAY_INTERVAL_MS); }),
        preloadImages(getSlideImageUrls(slides[nextIndex], viewport)),
      ]))
      .then(() => {
        if (cancelled) return;
        setDirection(1);
        setCurrentSlide(nextIndex);
      });

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [currentSlide, slides, viewport]);

  const layoutClass = layout === 'single' ? 'carousel--single' : '';

  if (isLoading) {
    return (
      <div className={`carousel carousel--skeleton ${layoutClass}`} role="status" aria-live="polite" aria-label="Cargando carrusel">
        <span className="carousel-pulse-dot" aria-hidden="true" />
      </div>
    );
  }

  if (hasError || slides.length === 0) {
    return (
      <div className={`carousel carousel--empty ${layoutClass}`} role="status" aria-label="Sin imágenes de portada">
        <img src={logoImg} alt="LIA" className="carousel-empty__logo" />
      </div>
    );
  }

  const visibleSlide = slides[currentSlide];

  return (
    <div className={`carousel ${layoutClass}`}>
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentSlide}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 }
          }}
          className="carousel-slide"
        >
          <div className="carousel-images-container">
            {visibleSlide.images.map((url, idx) => (
              <CarouselImage
                key={url}
                src={buildCarouselImageUrl(url, viewport, visibleSlide.images.length)}
                placeholderSrc={buildCarouselPlaceholderUrl(url)}
                isPriority={idx === 0 && currentSlide === 0}
              />
            ))}
            <div className="carousel-overlay" />
          </div>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <button
            className="carousel-arrow carousel-arrow-left"
            onClick={() => goToSlide((currentSlide - 1 + slides.length) % slides.length, -1)}
            aria-label="Anterior"
          >
            <FiChevronLeft />
          </button>
          <button
            className="carousel-arrow carousel-arrow-right"
            onClick={() => goToSlide((currentSlide + 1) % slides.length, 1)}
            aria-label="Siguiente"
          >
            <FiChevronRight />
          </button>
        </>
      )}

      <div className="carousel-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index, index > currentSlide ? 1 : -1)}
            aria-label={`Ir al slide ${index + 1}`}
            aria-current={index === currentSlide ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
