import { useEffect, useRef } from 'react';
import { TAB_ATTENTION_CONFIG } from '../config/tabAttention';

const FAVICON_SELECTOR = 'link[rel="icon"]';

function pickRandomMessage(): string {
  const { awayMessages } = TAB_ATTENTION_CONFIG;
  return awayMessages[Math.floor(Math.random() * awayMessages.length)];
}

function setFavicon(href: string) {
  const link = document.querySelector<HTMLLinkElement>(FAVICON_SELECTOR);
  if (link) link.href = href;
}

/**
 * Cambia favicon y título de la pestaña cuando el usuario deja de ver el sitio,
 * y los restaura apenas vuelve. El mensaje se elige una sola vez por cada
 * "salida" para que no cambie mientras el usuario está afuera.
 */
export function useTabAwayMarketing(enabled: boolean = true) {
  const originalTitleRef = useRef<string | null>(null);
  const isAwayRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    const restore = () => {
      if (!isAwayRef.current) return;
      isAwayRef.current = false;
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current;
      }
      setFavicon(TAB_ATTENTION_CONFIG.faviconDefault);
      originalTitleRef.current = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isAwayRef.current) return;
        originalTitleRef.current = document.title;
        isAwayRef.current = true;
        document.title = pickRandomMessage();
        setFavicon(TAB_ATTENTION_CONFIG.faviconAway);
      } else {
        restore();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      restore();
    };
  }, [enabled]);
}
