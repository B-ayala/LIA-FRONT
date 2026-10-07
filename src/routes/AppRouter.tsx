import { lazy, Suspense } from 'react';
import { Navigate, Routes, Route, Outlet } from 'react-router-dom';
import ScrollToTop from '../components/common/ScrollToTop';
import { InitialRouteReady } from '../components/common/InitialLoad/InitialLoadProvider';
import { NavigationLoadProvider } from '../components/common/NavigationLoad/NavigationLoadProvider';
import LiaLoader from '../components/common/LiaLoader/LiaLoader';
import { useAuthStore } from '../store/authStore';

// Layouts y guards quedan EAGER: son wrappers que siempre se renderizan; lazy
// loadearlos introduce un flash innecesario al entrar a cualquier ruta.
import UserLayout from '../users/layout/UserLayout';
import AdminProtectedRoute from '../admin/routes/AdminProtectedRoute';
import AdminLayout from '../admin/layout/AdminLayout';
// Home y ProductDetail también quedan EAGER: son las dos puertas de entrada
// reales del sitio para tráfico nuevo — Home recibe la mayoría de las visitas
// directas a "/", y ProductDetail recibe visitas directas por link compartido
// (WhatsApp, redes, resultados de búsqueda con su propio SEO). Si se cargan
// con lazy(), el browser paga una vuelta de red extra (descargar+parsear el
// bundle principal, recién ahí pedir el chunk de la página) antes de arrancar
// su fetch, retrasando el primer contenido visible. El resto de las rutas
// solo se llega navegando desde dentro del sitio, así que lazy() ahí no paga
// ese costo extra en el peor caso de entrada.
import Home from '../users/pages/home/Home';
import ProductDetail from '../users/pages/producDetail/ProductDetail';

// Redirige a /admin si hay una sesión de admin activa.
// Usa isAuthenticated que ya está hidratado sincrónicamente desde localStorage,
// así que el redirect es instantáneo sin esperar initializeAuth.
const AdminRedirect = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/admin" replace />;
  return <Outlet />;
};

// Páginas hoja: lazy. Esto permite que el bundle público no arrastre el
// código admin (y viceversa). El chunk de cada página se carga cuando se
// navega a ella. Home y ProductDetail son la excepción (import eager arriba).
const Products = lazy(() => import('../users/pages/products/Products'));
const Checkout = lazy(() => import('../users/pages/checkout/Checkout'));
const CheckoutResult = lazy(() => import('../users/pages/checkout/CheckoutResult'));
const Contact = lazy(() => import('../users/pages/contact/Contact'));
const About = lazy(() => import('../users/pages/about/About'));
const EmailConfirmation = lazy(() => import('../users/pages/auth/EmailConfirmation'));
const ResetPassword = lazy(() => import('../users/pages/auth/ResetPassword'));

// El panel admin usa MUI en casi todas sus pantallas, así que su theme se monta
// una sola vez acá, en la ruta. Al ser lazy, MUI no entra en el bundle crítico
// del visitante público (AdminLayout sigue eager, como el resto de los layouts).
const MuiThemeScope = lazy(() => import('../components/common/MuiTheme/MuiThemeScope'));

const HomeManager = lazy(() => import('../admin/pages/HomeManager/HomeManager'));
const AdminProducts = lazy(() => import('../admin/pages/Products/Products'));
const AdminProductPreview = lazy(() => import('../admin/pages/ProductPreview/ProductPreview'));
const AdminUsers = lazy(() => import('../admin/pages/Users/Users'));
const AboutEditor = lazy(() => import('../admin/pages/AboutEditor/AboutEditor'));
const FooterEditor = lazy(() => import('../admin/pages/FooterEditor/FooterEditor'));
const CloudinaryManager = lazy(() => import('../admin/pages/CloudinaryManager/CloudinaryManager'));
const ThemesManager = lazy(() => import('../admin/pages/ThemesManager/ThemesManager'));
const AdminSales = lazy(() => import('../admin/pages/Sales/Sales'));
const AdminDispatches = lazy(() => import('../admin/pages/Dispatches/Dispatches'));
const AdminStock = lazy(() => import('../admin/pages/Stock/Stock'));

// Fallback estable: min-height evita colapso del layout mientras se descarga
// el chunk de la página. Solo se ve en conexiones lentas — la navegación
// normal ya queda cubierta por NavigationLoadProvider.
const RouteFallback = () => (
  <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
    <LiaLoader size="lg" variant="section" label="Cargando…" />
  </div>
);

const AppRouter = () => {
  return (
    <NavigationLoadProvider>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Auth Routes */}
          <Route path="/auth/confirm" element={<EmailConfirmation />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />

          {/* Admin Routes */}
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<InitialRouteReady><MuiThemeScope><AdminLayout /></MuiThemeScope></InitialRouteReady>}>
              <Route index element={<HomeManager />} />
              <Route path="home" element={<HomeManager />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/preview" element={<AdminProductPreview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="about" element={<AboutEditor />} />
              <Route path="site-config" element={<FooterEditor />} />
              <Route path="cloudinary" element={<CloudinaryManager />} />
              <Route path="themes" element={<ThemesManager />} />
              <Route path="sales" element={<AdminSales />} />
              <Route path="dispatches" element={<AdminDispatches />} />
              <Route path="stock" element={<AdminStock />} />
            </Route>
          </Route>

          {/* Public Routes — redirige a /admin si la sesión es de admin */}
          <Route element={<AdminRedirect />}>
            <Route element={<UserLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/result" element={<InitialRouteReady><CheckoutResult /></InitialRouteReady>} />
              <Route path="/contact" element={<InitialRouteReady><Contact /></InitialRouteReady>} />
              <Route path="/about" element={<About />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </NavigationLoadProvider>
  );
};

export default AppRouter;
