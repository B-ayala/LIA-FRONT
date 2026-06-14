import { useState, useEffect } from 'react';
import { FaWhatsapp, FaEnvelope, FaTiktok, FaFacebook, FaMapMarkerAlt } from 'react-icons/fa';
import type { FooterInfo } from '../../../admin/store/adminStore';
import { getSiteContent } from '../../../services/siteContentService';
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
};

const Footer = () => {
  const [footerInfo, setFooterInfo] = useState<FooterInfo>(emptyFooter);

  useEffect(() => {
    const loadFooter = async () => {
      try {
        const data = await getSiteContent<FooterInfo>('footer');

        if (data) {
          setFooterInfo(data);
        }
      } catch (error) {
        console.error('Error loading footer:', error);
      }
    };

    loadFooter();
  }, []);

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

      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} {footerInfo.copyright}</p>
      </div>
    </footer>
  );
};

export default Footer;
