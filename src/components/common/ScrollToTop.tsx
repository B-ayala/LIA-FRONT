import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  // Deshabilita la restauración automática de scroll del navegador.
  // Sin esto, al hacer refresh el browser restaura la posición anterior
  // después de que el contenido asíncrono carga, tirando la página para abajo.
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
