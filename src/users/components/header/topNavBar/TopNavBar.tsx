import { useState, useEffect } from 'react';
import { supabase } from '../../../../config/supabaseClient';
import { getSiteContent, normalizeBannerInfo } from '../../../../services/siteContentService';
import type { BannerInfo } from '../../../../services/siteContentService';
import './TopNavBar.css';

const LOAD_TIMEOUT_MS = 8000;
const TIMED_OUT = Symbol('banner-load-timed-out');

const BANNER_CACHE_KEY = 'lia:top-banner-cache';

// El banner tarda lo que tarde el round-trip a Supabase, y sin caché eso se
// nota como "a veces aparece al toque, a veces tarda": cada carga de página
// vuelve a esperar la red desde cero. Guardamos el último banner válido para
// pintarlo al instante mientras se revalida en segundo plano.
function readCachedBanner(): BannerInfo | null {
  try {
    const raw = localStorage.getItem(BANNER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as BannerInfo) : null;
  } catch {
    return null;
  }
}

function writeCachedBanner(banner: BannerInfo | null) {
  try {
    if (banner) {
      localStorage.setItem(BANNER_CACHE_KEY, JSON.stringify(banner));
    } else {
      localStorage.removeItem(BANNER_CACHE_KEY);
    }
  } catch {
    // Modo privado / cuota llena: degrada a sin caché, no es crítico.
  }
}

const TopNavBar = () => {
  const [bannerInfo, setBannerInfo] = useState<BannerInfo | null>(readCachedBanner);
  const [isLoading, setIsLoading] = useState(() => readCachedBanner() === null);

  useEffect(() => {
    let isMounted = true;

    const loadBanner = async () => {
      try {
        const result = await Promise.race([
          getSiteContent<unknown>('banner'),
          new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), LOAD_TIMEOUT_MS)),
        ]);

        // Si se cortó por timeout (no porque el servidor haya respondido "sin
        // banner"), dejamos el banner cacheado como está en vez de borrarlo.
        if (result === TIMED_OUT) {
          return;
        }

        const banner = normalizeBannerInfo(result);

        if (isMounted) {
          setBannerInfo(banner);
        }
        writeCachedBanner(banner);
      } catch (error) {
        console.error('Error loading banner:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBanner();

    const channel = supabase
      .channel('public:site_content:banner')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_content',
          filter: 'key=eq.banner',
        },
        () => {
          void loadBanner();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading || !bannerInfo || !bannerInfo.text || !bannerInfo.visible) {
    return null;
  }

  return (
    <div className="top-navbar">
      <div className="top-navbar-track">
        <span className="top-navbar-text">{bannerInfo.text}</span>
        <span className="top-navbar-text" aria-hidden="true">{bannerInfo.text}</span>
      </div>
    </div>
  );
};

export default TopNavBar;
