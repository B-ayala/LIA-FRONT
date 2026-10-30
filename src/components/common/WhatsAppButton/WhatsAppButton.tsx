import React, { useState, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import type { FooterInfo } from '../../../admin/store/adminStore';
import { getSiteContent } from '../../../services/siteContentService';
import { useSiteContentRefresh } from '../../../hooks/useSiteContentRefresh';
import './WhatsAppButton.css';

const FOOTER_KEYS = ['footer'] as const;

const WhatsAppButton: React.FC = () => {
  const [footerInfo, setFooterInfo] = useState<FooterInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTick = useSiteContentRefresh(FOOTER_KEYS);

  // Cargar footer desde Supabase al montar y cada vez que el admin lo cambia
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
  }, [refreshTick]);

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
