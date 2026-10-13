import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import LiaLoader from '../../components/common/LiaLoader/LiaLoader';

const AdminProtectedRoute = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const authInitialized = useAuthStore((state) => state.authInitialized);

    // La sesión vive en memoria y se recupera async al cargar: sin esta espera,
    // recargar /admin redirigiría al Home antes de saber si hay sesión de admin.
    if (!authInitialized) return <LiaLoader size="lg" />;

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default AdminProtectedRoute;
