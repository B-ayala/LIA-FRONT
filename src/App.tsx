import { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
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
import { useCartTabSync } from './hooks/useCartTabSync';

const AppContent = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isAuthRoute = location.pathname.startsWith('/auth');
  // Un admin nunca ve el chrome público: AdminRedirect lo manda a /admin, pero
  // entre el login y ese redirect la URL todavía es pública y el Footer parpadeaba.
  const isAdminSession = useAuthStore((state) => state.isAuthenticated);
  const showPublicChrome = !isAdmin && !isAdminSession;
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const logout = useAuthStore((state) => state.logout);
  const { completeTask, isInitialLoading } = useInitialLoad();

  useTabAwayMarketing(!isAdmin && !isAuthRoute);
  useCartTabSync();

  useEffect(() => {
    // La sesión vive solo en memoria: se recupera en segundo plano con la cookie
    // httpOnly del backend. No bloquea el splash (un backend lento no debe frenar
    // el Home público); las rutas que dependen de la sesión esperan `authInitialized`.
    completeTask('auth');

    void initializeAuth();

    // Cuando apiFetch detecta token inválido o refresh fallido, dispara este evento.
    const onForcedLogout = () => {
      void logout();
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
  }, [completeTask, initializeAuth, logout]);

  useEffect(() => {
    if (isAdmin || isAuthRoute) {
      completeTask('public-layout');
    }
  }, [completeTask, isAdmin, isAuthRoute]);

  return (
    <>
      <AppRouter />
      {showPublicChrome && <Footer />}
      {showPublicChrome && !isAuthRoute && <WhatsAppButton />}
      {showPublicChrome && !isAuthRoute && !isInitialLoading && <WelcomeAnnouncementModal />}
    </>
  );
};

// El ThemeProvider de MUI no vive más acá: lo monta cada consumidor de MUI
// (todos detrás de lazy()) vía MuiThemeScope, y el reset que aportaba
// CssBaseline quedó replicado en index.css. Así el visitante que entra al Home
// no descarga ~75 kB gzip de MUI que no va a usar. Ver src/index.css.
function App() {
  return (
    <HelmetProvider>
      <SeasonThemeProvider>
        <TypographyProvider>
          <BrowserRouter>
            <InitialLoadProvider>
              <AppContent />
            </InitialLoadProvider>
          </BrowserRouter>
        </TypographyProvider>
      </SeasonThemeProvider>
    </HelmetProvider>
  );
}

export default App;
