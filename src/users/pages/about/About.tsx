import { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import SEO from '../../../components/common/SEO/SEO';
import { buildCloudinaryUrl } from '../../../utils/cloudinary';
import { useInitialLoadTask } from '../../../components/common/InitialLoad/InitialLoadProvider';
import { getSiteContent } from '../../../services/siteContentService';
import './About.css';

interface AboutInfo {
  title: string;
  description: string;
  imageUrl: string;
  mission?: string;
  vision?: string;
  values?: { title: string; description: string }[];
}

interface HeroImageData {
  imageUrl: string;
  altText: string;
  title: string;
  backgroundPosition?: string;
}

const About = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aboutInfo, setAboutInfo] = useState<AboutInfo | null>(null);
  const [heroImage, setHeroImage] = useState<HeroImageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImageReady, setIsImageReady] = useState(false);
  const [isHeroImageReady, setIsHeroImageReady] = useState(false);

  const image = aboutInfo?.imageUrl;

  useInitialLoadTask('route', isLoading || (!!image && !isImageReady) || (!!heroImage?.imageUrl && !isHeroImageReady));

  useEffect(() => {
    const loadAbout = async () => {
      try {
        const data = await getSiteContent<AboutInfo>('about');

        if (data) {
          setAboutInfo(data);
        }

        const heroData = await getSiteContent<HeroImageData>('hero_image');

        if (heroData) {
          setHeroImage(heroData);
        }
      } catch (error) {
        console.error('Error loading about content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAbout();
  }, []);

  useEffect(() => {
    setIsImageReady(!image);
  }, [image]);

  useEffect(() => {
    if (!heroImage?.imageUrl) {
      setIsHeroImageReady(true);
      return;
    }

    const img = new Image();
    img.src = buildCloudinaryUrl(heroImage.imageUrl, {
      width: window.innerWidth <= 768 ? 600 : 1200,
      quality: 'auto',
      format: 'auto'
    });

    if (img.complete) {
      setIsHeroImageReady(true);
      return;
    }

    img.onload = () => setIsHeroImageReady(true);
    img.onerror = () => setIsHeroImageReady(true);
  }, [heroImage]);

  const title = aboutInfo?.title;
  const description = aboutInfo?.description;

  const heroBackgroundImage = heroImage?.imageUrl
    ? buildCloudinaryUrl(heroImage.imageUrl, {
        width: window.innerWidth <= 768 ? 600 : 1200,
        quality: 'auto',
        format: 'auto'
      })
    : undefined;

  const heroBackgroundPosition = heroImage?.backgroundPosition || '50% 50%';

  return (
    <div className="about-page">
      <SEO
        title="Nosotros"
        description="Conocé la historia de LIA by Damiana Bella. Nuestra misión, visión y valores como marca de moda femenina argentina."
        path="/about"
      />
      <div
        className="about-hero"
        style={heroBackgroundImage ? {
          backgroundImage: `url('${heroBackgroundImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: heroBackgroundPosition
        } : undefined}
      >
        <div className="about-hero-content">
          <h1 className="about-title">{heroImage?.title || title}</h1>
        </div>
      </div>

      <div className="about-container">
        <div className="about-main-content">
          <div className="about-text-section">
            <p>{description}</p>

            <button
              className="about-btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              Conócenos más
            </button>
          </div>

          <div className="about-image-section">
            <img
              src={buildCloudinaryUrl(image ?? '', {
                width: 450,
                quality: 'auto',
                format: 'auto'
              })}
              alt="Esencia de LIA"
              className="about-image"
              loading="lazy"
              decoding="async"
              width={450}
              height={600}
              onLoad={() => setIsImageReady(true)}
              onError={() => setIsImageReady(true)}
            />
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="La Esencia de LIA"
      >
        <div className="about-modal-content">
          {aboutInfo?.mission && (
            <div className="modal-section">
              <p>{aboutInfo.mission}</p>
            </div>
          )}

          {aboutInfo?.vision && (
            <div className="modal-section">
              <p>{aboutInfo.vision}</p>
            </div>
          )}

          {aboutInfo?.values && aboutInfo.values.length > 0 && (
            <div className="modal-section">
              <ul className="values-list">
                {aboutInfo.values.map((value, index) => (
                  <li key={index}><strong>{value.title}:</strong> {value.description}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="modal-closing">
            Gracias por ser parte de nuestra historia. ¡Estamos encantados de tenerte aquí!
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default About;
