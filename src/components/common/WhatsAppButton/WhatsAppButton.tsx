import React, { useState, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import type { FooterInfo } from '../../../admin/store/adminStore';
import { getSiteContent } from '../../../services/siteContentService';

const WhatsAppButton: React.FC = () => {
  const [footerInfo, setFooterInfo] = useState<FooterInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar footer desde Supabase al montar
  useEffect(() => {
    const loadFooter = async () => {
      try {
        const data = await getSiteContent<FooterInfo>('footer');

        if (data) {
          setFooterInfo(data);
        }
      } catch (err) {
        console.error('Error loading footer info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFooter();
  }, []);

  // Detectar si hay modal abierto
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsModalOpen(document.body.style.overflow === 'hidden');
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  // No mostrar si está cargando, hay modal abierto o no hay número de WhatsApp
  if (isLoading || isModalOpen || !footerInfo?.whatsapp) return null;

  const whatsappUrl = `https://wa.me/${footerInfo.whatsapp.replace(/[^0-9]/g, '')}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      style={{
        position: 'fixed',
        width: '60px',
        height: '60px',
        bottom: '40px',
        right: '40px',
        backgroundColor: '#25d366',
        color: '#FFF',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        textDecoration: 'none',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.backgroundColor = '#1ebe57';
        el.style.transform = 'scale(1.1)';
        el.style.boxShadow = '0 2px 15px rgba(0, 0, 0, 0.3)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.backgroundColor = '#25d366';
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
      }}
    >
      <FaWhatsapp size={35} />
    </a>
  );
};

export default WhatsAppButton;
