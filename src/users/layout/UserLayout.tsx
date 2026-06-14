import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopNavBar from '../components/header/topNavBar/TopNavBar';
import NavBar from '../components/header/navBar/NavBar';
import SeasonalBackdrop from '../components/SeasonalBackdrop/SeasonalBackdrop';
import { useNavigationLoad } from '../../components/common/NavigationLoad/NavigationLoadProvider';
import NavigationLoadingScreen from '../../components/common/NavigationLoad/NavigationLoadingScreen';

const UserLayout = () => {
    const { isNavigationLoading } = useNavigationLoad();
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (isNavigationLoading) {
            setShowLoadingScreen(true);
            setIsExiting(false);
        } else if (showLoadingScreen) {
            // Start exit animation
            setIsExiting(true);
            // Remove from DOM after animation completes
            const timer = setTimeout(() => {
                setShowLoadingScreen(false);
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isNavigationLoading, showLoadingScreen]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <SeasonalBackdrop />
            <div style={{ position: 'sticky', top: 0, zIndex: 200, width: '100%' }}>
                <TopNavBar />
                <NavBar />
            </div>
            <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                {showLoadingScreen && <NavigationLoadingScreen isExiting={isExiting} />}
                <Outlet />
            </div>
        </div>
    );
};

export default UserLayout;
