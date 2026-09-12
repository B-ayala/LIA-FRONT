import { Outlet } from 'react-router-dom';
import TopNavBar from '../components/header/topNavBar/TopNavBar';
import NavBar from '../components/header/navBar/NavBar';
import SeasonalBackdrop from '../components/SeasonalBackdrop/SeasonalBackdrop';
import { useTypography } from '../../utils/TypographyProvider';

const UserLayout = () => {
    const { userLayoutStyle } = useTypography();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', ...userLayoutStyle }}>
            <SeasonalBackdrop />
            <div style={{ position: 'sticky', top: 0, zIndex: 200, width: '100%' }}>
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
