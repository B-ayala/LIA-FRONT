import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp, FaEnvelope, FaTiktok, FaFacebook, FaMapMarkerAlt } from 'react-icons/fa';
import type { FooterInfo } from '../../../admin/store/adminStore';
import { getSiteContent } from '../../../services/siteContentService';
import SellerInfo from './SellerInfo';
import { hasSellerInfo } from '../../../utils/legalFooter';
import DataFiscalBadge from './DataFiscalBadge';
import './Footer.css';

const emptyFooter: FooterInfo = {
  brandName: '',
  description: '',
  whatsapp: '',
  email: '',
  tiktokUser: '',
  tiktokUrl: '',
  facebookUser: '',
  facebookUrl: '',
  address: '',
  mapQuery: '',
  copyright: '',
  legalName: '',
  cuit: '',
  fiscalAddress: '',
  businessHours: '',
  responsibleArea: '',
  dataFiscalUrl: '',
  dataFiscalImageUrl: '',
};

// Texto exacto exigido por la Disposición 954/2025; no se traduce ni se abrevia.
const WITHDRAWAL_LINK_LABEL = 'BOTÓN DE ARREPENTIMIENTO';

// Se renderiza también durante la carga del footer: el enlace no depende del contenido del CMS.
const WithdrawalLink = () => (
  <Link to="/arrepentimiento" className="footer-withdrawal-link">
    {WITHDRAWAL_LINK_LABEL}
  </Link>
);

const LEGAL_LINKS: ReadonlyArray<{ to: string; label: string }> = [
  { to: '/terminos', label: 'Términos y condiciones' },
  { to: '/privacidad', label: 'Política de privacidad' },
  { to: '/cambios-y-devoluciones', label: 'Cambios y devoluciones' },
];

// Ventanilla de reclamos de consumidores de la Secretaría de Industria y Comercio.
const CONSUMER_DEFENSE_URL = 'https://autogestion.produccion.gob.ar/consumidores';

const LegalLinks = () => (
  <>
    <nav className="footer-legal-links" aria-label="Información legal">
      {LEGAL_LINKS.map(({ to, label }) => (
        <Link key={to} to={to} className="footer-link">{label}</Link>
      ))}
    </nav>
    <p className="footer-consumer-defense">
      Defensa de las y los Consumidores. Para reclamos:{' '}
      <a href={CONSUMER_DEFENSE_URL} target="_blank" rel="noopener noreferrer">Ingrese aquí</a>
    </p>
  </>
);

const Footer = () => {
  const [footerInfo, setFooterInfo] = useState<FooterInfo>(emptyFooter);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFooter = async () => {
      try {
        const data = await getSiteContent<FooterInfo>('footer');

        if (data) {
          setFooterInfo(data);
        }
      } catch (error) {
        console.error('Error loading footer:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFooter();
  }, []);

  if (isLoading) {
    return (
      <footer className="footer-container">
        <div className="footer-content" aria-busy="true" aria-label="Cargando información del sitio">
          <div className="footer-column footer-brand">
            <div className="footer-skeleton footer-skeleton--logo skeleton" />
            <div className="footer-skeleton footer-skeleton--line skeleton" />
            <div className="footer-skeleton footer-skeleton--line footer-skeleton--line-short skeleton" />
          </div>
          <div className="footer-column footer-contact">
            <div className="footer-skeleton footer-skeleton--title skeleton" />
            <div className="footer-skeleton footer-skeleton--line skeleton" />
            <div className="footer-skeleton footer-skeleton--line skeleton" />
          </div>
        </div>
        <LegalLinks />
        <div className="footer-bottom">
          <div className="footer-skeleton footer-skeleton--copyright skeleton" />
          <WithdrawalLink />
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer-container">
      <div className="footer-content">

        {/* Columna 1: Logo y descripción */}
        <div className="footer-column footer-brand">
          <h2 className="footer-logo">{footerInfo.brandName}</h2>
          <p className="footer-description">
            {footerInfo.description}
          </p>
        </div>

        {/* Columna 2: Redes y Contacto */}
        <div className="footer-column footer-contact">
          <h3 className="footer-title">Contacto</h3>
          <ul className="footer-links">
            {footerInfo.whatsapp && (
              <li>
                <a href={`https://wa.me/${footerInfo.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="footer-link">
                  <FaWhatsapp className="footer-icon" /> {footerInfo.whatsapp}
                </a>
              </li>
            )}
            {footerInfo.email && (
              <li>
                <a href={`mailto:${footerInfo.email}`} className="footer-link">
                  <FaEnvelope className="footer-icon" /> {footerInfo.email}
                </a>
              </li>
            )}
            {footerInfo.tiktokUser && (
              <li>
                <a href={footerInfo.tiktokUrl} target="_blank" rel="noopener noreferrer" className="footer-link">
                  <FaTiktok className="footer-icon" /> {footerInfo.tiktokUser}
                </a>
              </li>
            )}
            {footerInfo.facebookUser && (
              <li>
                <a href={footerInfo.facebookUrl} target="_blank" rel="noopener noreferrer" className="footer-link">
                  <FaFacebook className="footer-icon" /> {footerInfo.facebookUser}
                </a>
              </li>
            )}
          </ul>
        </div>

        {/* Columna 3: Dirección y Mapa */}
        {footerInfo.address && (
          <div className="footer-column footer-location">
            <h3 className="footer-title">Visitanos</h3>
            <p className="footer-address">
              <FaMapMarkerAlt className="footer-icon" />
              {footerInfo.address}
            </p>
            {footerInfo.mapQuery && (
              <div className="footer-map-container">
                <iframe
                  title="Ubicación LIA"
                  src={`https://maps.google.com/maps?q=${footerInfo.mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            )}
          </div>
        )}

        {hasSellerInfo(footerInfo) && <SellerInfo info={footerInfo} />}

      </div>

      <DataFiscalBadge url={footerInfo.dataFiscalUrl} imageUrl={footerInfo.dataFiscalImageUrl} />

      <LegalLinks />

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} {footerInfo.copyright}</p>
        <WithdrawalLink />
      </div>
    </footer>
  );
};

export default Footer;
