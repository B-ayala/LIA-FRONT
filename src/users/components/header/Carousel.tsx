import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CarouselLayout } from '../../../services/productService';
import { loadCarouselData } from '../../../utils/carouselData';
import { groupBySlide, imagesPerSlide, type CarouselItem } from '../../../utils/carouselSlides';
import { BANNER_REFERENCE_WIDTH, bannerImageUrls, type BannerDesign } from '../../../utils/carouselBanner';
import { buildCarouselImageUrl, type CarouselViewport } from '../../../utils/carouselImageUrl';
import { readCachedFirstImage, writeCachedFirstImage } from '../../../utils/carouselImageCache';
import { preloadImage, preloadImages } from '../../../utils/preloadImage';
import { useRefetchOnVisible } from '../../../hooks/useRefetchOnVisible';
import { useNavbarToneStore } from '../../../store/navbarToneStore';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import BannerCanvas from '../../../components/common/BannerCanvas/BannerCanvas';
import CarouselSlideImages, { CAROUSEL_LOADING_LABEL } from './CarouselSlideImages';
import logoImg from '../../../assets/img/logo.jpeg';
import './Carousel.css';

// `navbarColor` es el del primer elemento del slide: en un collage el menú
// cruza varias fotos y no puede tener un color por cada una.
type Slide =
  | { kind: 'images'; images: string[]; navbarColor: string | null }
  | { kind: 'banner'; design: BannerDesign; navbarColor: string | null };

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

const toSlide = (group: CarouselItem[]): Slide => {
  const [first] = group;
  if (first.kind === 'banner') {
    return { kind: 'banner', design: first.design, navbarColor: first.navbarColor };
  }
  return {
    kind: 'images',
    images: group.flatMap((item) => (item.kind === 'image' ? [item.url] : [])),
    navbarColor: first.navbarColor,
  };
};

const groupIntoSlides = (items: CarouselItem[], layout: CarouselLayout, isMobile: boolean): Slide[] =>
  groupBySlide(items, imagesPerSlide(layout, isMobile)).map(toSlide);

const getSlideImageUrls = (slide: Slide, viewport: CarouselViewport, deviceType: DeviceType): string[] =>
  slide.kind === 'banner'
    ? bannerImageUrls(slide.design, BANNER_REFERENCE_WIDTH[deviceType])
    : slide.images.map((url) => buildCarouselImageUrl(url, viewport, slide.images.length));

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

  // Revalidación silenciosa al volver a la pestaña: sin skeleton, sin saltar de
  // slide y sin tocar nada si el admin no cambió el carrusel.
  const refreshCarousel = useCallback(() => {
    loadCarouselData(deviceType)
      .then(({ items, layout: loadedLayout }) => {
        const grouped = groupIntoSlides(items, loadedLayout, deviceType === 'mobile');
        setLoaded((previous) => {
          if (previous?.deviceType !== deviceType || previous.hasError) return previous;
          const unchanged = previous.layout === loadedLayout && JSON.stringify(previous.slides) === JSON.stringify(grouped);
          return unchanged ? previous : { deviceType, slides: grouped, layout: loadedLayout, hasError: false };
        });
        setCurrentSlide((index) => (index < grouped.length ? index : 0));
      })
      .catch(console.error);
  }, [deviceType]);
  useRefetchOnVisible(refreshCarousel);

  useEffect(() => {
    let cancelled = false;

    loadCarouselData(deviceType)
      .then(({ items, layout: loadedLayout }) => {
        if (cancelled) return;

        const grouped = groupIntoSlides(items, loadedLayout, deviceType === 'mobile');
        // Se guarda la cantidad real de imágenes del primer slide (el último
        // grupo puede tener menos que el máximo): determina el ancho exacto
        // que pide el flujo real, y la pista tiene que coincidir con él.
        const firstSlide = grouped[0];
        if (firstSlide?.kind === 'images') {
          writeCachedFirstImage(deviceType, {
            url: firstSlide.images[0],
            layout: loadedLayout,
            imageCount: firstSlide.images.length,
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

  // El navbar (transparente sobre el carrusel) toma el color del slide visible.
  const setSlideNavbarColor = useNavbarToneStore((state) => state.setSlideColor);
  const visibleNavbarColor = slides[currentSlide]?.navbarColor ?? null;
  useEffect(() => {
    setSlideNavbarColor(visibleNavbarColor);
  }, [visibleNavbarColor, setSlideNavbarColor]);
  useEffect(() => () => setSlideNavbarColor(null), [setSlideNavbarColor]);

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

    preloadImages(getSlideImageUrls(slides[currentSlide], viewport, deviceType))
      .then(() => Promise.all([
        new Promise<void>((resolve) => { timerId = setTimeout(resolve, AUTOPLAY_INTERVAL_MS); }),
        preloadImages(getSlideImageUrls(slides[nextIndex], viewport, deviceType)),
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
  }, [currentSlide, slides, viewport, deviceType]);

  const layoutClass = layout === 'single' ? 'carousel--single' : '';

  if (isLoading) {
    return (
      <div className={`carousel carousel--skeleton ${layoutClass}`}>
        <LiaLoader size="lg" variant="section" label={CAROUSEL_LOADING_LABEL} />
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
          {visibleSlide.kind === 'banner' ? (
            <BannerCanvas design={visibleSlide.design} referenceWidth={BANNER_REFERENCE_WIDTH[deviceType]} />
          ) : (
            <CarouselSlideImages
              sources={visibleSlide.images.map((url) => buildCarouselImageUrl(url, viewport, visibleSlide.images.length))}
              isFirstSlide={currentSlide === 0}
            />
          )}
        </motion.div>
      </AnimatePresence>

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
