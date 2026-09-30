import { Outlet, useLocation } from 'react-router-dom';
import TopNavBar from '../components/header/topNavBar/TopNavBar';
import NavBar from '../components/header/navBar/NavBar';
import SeasonalBackdrop from '../components/SeasonalBackdrop/SeasonalBackdrop';
import { useTypography } from '../../utils/TypographyProvider';

const UserLayout = () => {
    const { userLayoutStyle } = useTypography();
    const { pathname } = useLocation();
    // En Home el header no reserva espacio: queda fijo y superpuesto sobre el
    // carrusel (que ocupa toda la pantalla). En el resto de las páginas se
    // mantiene "sticky", como antes.
    const isHome = pathname === '/';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', ...userLayoutStyle }}>
            <SeasonalBackdrop />
            <div style={{ position: isHome ? 'fixed' : 'sticky', top: 0, left: 0, zIndex: 200, width: '100%' }}>
                <TopNavBar />
                <NavBar />
            </div>
            <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                <Outlet />
            </div>
        </div>
    );
};

export default UserLayout;
