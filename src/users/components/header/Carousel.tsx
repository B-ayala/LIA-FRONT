import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { fetchCarouselImages } from '../../../services/productService';
import { buildCloudinaryUrl } from '../../../utils/cloudinary';
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

const Carousel = ({ onReady }: CarouselProps) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const hasReportedReady = useRef(false);

  const notifyReady = () => {
    if (hasReportedReady.current) {
      return;
    }

    hasReportedReady.current = true;
    onReady?.();
  };

  // Detect mobile/desktop based on window width
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch carousel images and group them based on device type
  useEffect(() => {
    const deviceType = isMobile ? 'mobile' : 'desktop';
    const imgsPerSlide = isMobile ? 2 : 3;
    hasReportedReady.current = false;

    fetchCarouselImages(deviceType)
      .then(images => {
        const grouped: Slide[] = [];
        for (let i = 0; i < images.length; i += imgsPerSlide) {
          grouped.push({ images: images.slice(i, i + imgsPerSlide).map(img => img.url) });
        }
        setSlides(grouped);
        setCurrentSlide(0);
        if (grouped.length === 0) {
          notifyReady();
        }
      })
      .catch((error) => {
        console.error(error);
        notifyReady();
      });
  }, [isMobile, onReady]);

  useEffect(() => {
    if (slides.length === 0) {
      return;
    }

    const firstImg = slides[0]?.images[0];
    if (!firstImg) {
      notifyReady();
      return;
    }

    const optimizedUrl = buildCloudinaryUrl(firstImg, {
      width: window.innerWidth <= 768 ? 600 : 1200,
      quality: 'auto',
      format: 'auto'
    });

    const image = new Image();
    image.src = optimizedUrl;

    if (image.complete) {
      notifyReady();
      return;
    }

    image.onload = notifyReady;
    image.onerror = notifyReady;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [slides, isMobile, onReady]);

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

  if (slides.length === 0) return <div className="carousel carousel--skeleton" aria-hidden="true" />;

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
                  width: isMobile ? 600 : 1200,
                  quality: 'auto',
                  format: 'auto'
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
