import React, { useState, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import type { FooterInfo } from '../../../admin/store/adminStore';
import { getSiteContent } from '../../../services/siteContentService';
import './WhatsAppButton.css';

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
      className="whatsapp-fab"
    >
      <FaWhatsapp />
    </a>
  );
};

export default WhatsAppButton;
