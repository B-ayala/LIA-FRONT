import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  // `history.scrollRestoration` ya se deshabilita en main.tsx, antes de que
  // React monte — acá sólo resta llevar el scroll a 0 en cada cambio de ruta.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
