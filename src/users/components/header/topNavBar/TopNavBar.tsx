import { useState, useEffect } from 'react';
import { supabase } from '../../../../config/supabaseClient';
import { getSiteContent, normalizeBannerInfo } from '../../../../services/siteContentService';
import type { BannerInfo } from '../../../../services/siteContentService';
import './TopNavBar.css';

const TopNavBar = () => {
  const [bannerInfo, setBannerInfo] = useState<BannerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadBanner = async () => {
      try {
        const data = await getSiteContent<unknown>('banner');
        const banner = normalizeBannerInfo(data);

        if (isMounted) {
          setBannerInfo(banner);
        }
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
