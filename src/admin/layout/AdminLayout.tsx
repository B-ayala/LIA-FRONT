import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AssistantWidget from '../components/Assistant/AssistantWidget';
import '../styles/adminShared.css';
import './AdminLayout.css';

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Close sidebar on location change for mobile
    useEffect(() => {
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    }, [location]);

    // MUI bloquea el scroll del body (overflow: hidden) mientras hay un Dialog
    // abierto, y lo libera cuando se cierra. Con dialogs anidados (ej: modal de
    // producto + confirmación de "sin stock" encima) ese manejo interno puede
    // desincronizarse y dejar el scroll bloqueado para siempre, aunque ya no
    // quede ningún modal visible. Se detecta el momento exacto en que el último
    // Dialog (portal montado en document.body) desaparece del DOM y, si el
    // bloqueo sigue activo, se libera a mano.
    useEffect(() => {
        const clearStuckScrollLock = () => {
            const anyDialogOpen = document.querySelector('.MuiModal-root[role="presentation"]');
            if (!anyDialogOpen && document.body.style.overflow === 'hidden') {
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }
        };
        const observer = new MutationObserver(clearStuckScrollLock);
        observer.observe(document.body, { childList: true });
        return () => observer.disconnect();
    }, []);

    return (
        <div className="admin-layout-container">
            <AdminSidebar
                isOpen={sidebarOpen}
                toggleSidebar={toggleSidebar}
            />
            <div className={`admin-main-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <AdminHeader toggleSidebar={toggleSidebar} />
                <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                    <main className="admin-main-content">
                        <Outlet />
                    </main>
                </div>
            </div>
            <AssistantWidget />
        </div>
    );
};

export default AdminLayout;
