import { useEffect, useState } from 'react';
import {
  DEFAULT_WELCOME_MODAL,
  getSiteContent,
  normalizeWelcomeModalInfo,
} from '../../../services/siteContentService';
import './WelcomeAnnouncementModal.css';

// Se muestra una vez por pestaña/sesión, no en cada navegación interna.
const SESSION_FLAG = 'welcome-announcement-shown';

const WelcomeAnnouncementModal = () => {
  const [info, setInfo] = useState<{ heading: string; lines: string[] } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_FLAG)) {
      return;
    }

    let isMounted = true;

    const loadAnnouncement = async () => {
      try {
        const raw = await getSiteContent<unknown>('welcomeModal');
        const normalized = normalizeWelcomeModalInfo(raw) ?? DEFAULT_WELCOME_MODAL;

        if (!isMounted || !normalized.enabled) {
          return;
        }

        setInfo({ heading: normalized.heading, lines: normalized.lines });
        setIsOpen(true);
        sessionStorage.setItem(SESSION_FLAG, '1');
      } catch (error) {
        console.error('Error loading welcome announcement:', error);
      }
    };

    void loadAnnouncement();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !info) return null;

  return (
    <div className="wam-overlay" onClick={() => setIsOpen(false)} role="presentation">
      <div
        className="wam-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wam-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="wam-close" onClick={() => setIsOpen(false)} aria-label="Cerrar">
          ✕
        </button>

        {info.heading && <h2 id="wam-heading" className="wam-heading">{info.heading}</h2>}

        <ul className="wam-lines">
          {info.lines.map((line, index) => (
            <li key={index} className="wam-line">{line}</li>
          ))}
        </ul>

        <button className="wam-cta" onClick={() => setIsOpen(false)}>
          Ver catálogo
        </button>
      </div>
    </div>
  );
};

export default WelcomeAnnouncementModal;
