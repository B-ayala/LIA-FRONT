import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useNavigationLoad } from '../../components/common/NavigationLoad/NavigationLoadProvider';
import NavigationLoadingScreen from '../../components/common/NavigationLoad/NavigationLoadingScreen';
import '../styles/adminShared.css';
import './AdminLayout.css';

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const { isNavigationLoading } = useNavigationLoad();

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Close sidebar on location change for mobile
    useEffect(() => {
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    }, [location]);

    return (
        <div className="admin-layout-container">
            <AdminSidebar
                isOpen={sidebarOpen}
                toggleSidebar={toggleSidebar}
            />
            <div className={`admin-main-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <AdminHeader toggleSidebar={toggleSidebar} />
                <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                    {isNavigationLoading && <NavigationLoadingScreen />}
                    <main className="admin-main-content">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
