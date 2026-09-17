import { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './utils/theme';
import { SeasonThemeProvider } from './utils/SeasonThemeProvider';
import { TypographyProvider } from './utils/TypographyProvider';
import AppRouter from './routes/AppRouter';
import WhatsAppButton from './components/common/WhatsAppButton/WhatsAppButton';
import Footer from './components/common/Footer/Footer';
import WelcomeAnnouncementModal from './users/components/WelcomeAnnouncementModal/WelcomeAnnouncementModal';
import { useAuthStore } from './store/authStore';
import { InitialLoadProvider, useInitialLoad } from './components/common/InitialLoad/InitialLoadProvider';
import { AUTH_LOGOUT_EVENT } from './utils/apiFetch';
import { useTabAwayMarketing } from './hooks/useTabAwayMarketing';

const AppContent = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isAuthRoute = location.pathname.startsWith('/auth');
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const setUserFromStorage = useAuthStore((state) => state.setUserFromStorage);
  const logout = useAuthStore((state) => state.logout);
  const { completeTask, isInitialLoading } = useInitialLoad();

  useTabAwayMarketing(!isAdmin && !isAuthRoute);

  useEffect(() => {
    // Hidratación rápida y sincrónica desde localStorage: ya deja el estado de
    // auth correcto para el primer render (login vs. avatar, redirect de admin).
    setUserFromStorage();
    completeTask('auth');

    // Validación contra backend en segundo plano (apiFetch refresca el access
    // token si hace falta). No bloquea el splash: es una revalidación, no una
    // condición para mostrar el Home — si falla o tarda, AUTH_LOGOUT_EVENT ya
    // se encarga de expulsar al usuario cuando corresponda.
    void initializeAuth();

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
      {!isAdmin && !isAuthRoute && !isInitialLoading && <WelcomeAnnouncementModal />}
    </>
  );
};

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SeasonThemeProvider>
          <TypographyProvider>
            <BrowserRouter>
              <InitialLoadProvider>
                <AppContent />
              </InitialLoadProvider>
            </BrowserRouter>
          </TypographyProvider>
        </SeasonThemeProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
