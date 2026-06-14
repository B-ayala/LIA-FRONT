import { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './utils/theme';
import { SeasonThemeProvider } from './utils/SeasonThemeProvider';
import AppRouter from './routes/AppRouter';
import WhatsAppButton from './components/common/WhatsAppButton/WhatsAppButton';
import Footer from './components/common/Footer/Footer';
import { useAuthStore } from './store/authStore';
import { InitialLoadProvider, useInitialLoad } from './components/common/InitialLoad/InitialLoadProvider';
import { AUTH_LOGOUT_EVENT } from './utils/apiFetch';

const AppContent = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isAuthRoute = location.pathname.startsWith('/auth');
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const setUserFromStorage = useAuthStore((state) => state.setUserFromStorage);
  const logout = useAuthStore((state) => state.logout);
  const { completeTask } = useInitialLoad();

  useEffect(() => {
    if (document.readyState === 'complete') {
      completeTask('window');
      return;
    }
    const handleWindowLoad = () => completeTask('window');
    window.addEventListener('load', handleWindowLoad);
    return () => window.removeEventListener('load', handleWindowLoad);
  }, [completeTask]);

  useEffect(() => {
    const setupAuth = async () => {
      try {
        // Hidratación rápida desde localStorage para evitar flicker
        setUserFromStorage();
        // Validación contra backend (apiFetch hace refresh si access expiró)
        await initializeAuth();
      } finally {
        completeTask('auth');
      }
    };
    void setupAuth();

    // Cuando apiFetch detecta token inválido o refresh fallido, dispara este evento.
    const onForcedLogout = () => {
      void logout();
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
  }, [completeTask, initializeAuth, setUserFromStorage, logout]);

  useEffect(() => {
    if (isAdmin || isAuthRoute) {
      completeTask('public-layout');
    }
  }, [completeTask, isAdmin, isAuthRoute]);

  return (
    <>
      <AppRouter />
      {!isAdmin && <Footer />}
      {!isAdmin && !isAuthRoute && <WhatsAppButton />}
    </>
  );
};

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SeasonThemeProvider>
          <BrowserRouter>
            <InitialLoadProvider>
              <AppContent />
            </InitialLoadProvider>
          </BrowserRouter>
        </SeasonThemeProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
