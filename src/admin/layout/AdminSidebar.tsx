import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, Users, Info, Settings, LogOut, Image, Palette, BarChart2, Truck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
// @ts-ignore - vite-imagetools query param
import logoImg from '../../assets/img/logo.jpeg?w=120&format=webp&quality=80';
import './AdminSidebar.css';

const AdminSidebar = ({ isOpen, toggleSidebar }: { isOpen: boolean, toggleSidebar: () => void }) => {
    const logout = useAuthStore(state => state.logout);

    const navItems = [
        { path: '/admin', name: 'Inicio', icon: Home },
        { path: '/admin/products', name: 'Productos', icon: ShoppingBag },
        { path: '/admin/sales', name: 'Ventas', icon: BarChart2 },
        { path: '/admin/dispatches', name: 'Despachos', icon: Truck },
        { path: '/admin/users', name: 'Usuarios', icon: Users },
        { path: '/admin/about', name: 'Acerca de', icon: Info },
        { path: '/admin/site-config', name: 'Config. del sitio', icon: Settings },
        { path: '/admin/themes', name: 'Temas', icon: Palette },
        { path: '/admin/cloudinary', name: 'Cloudinary', icon: Image },
    ];

    return (
        <>
            <div className={`admin-sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={toggleSidebar}></div>
            <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
                <div className="admin-sidebar-header">
                    <img src={logoImg} alt="LIA Logo" className="admin-sidebar-logo" />
                    <h2>Admin</h2>
                </div>
                
                <nav className="admin-sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink 
                            key={item.path}
                            to={item.path} 
                            end={item.path === '/admin'}
                            className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => { if(window.innerWidth <= 768) toggleSidebar() }}
                        >
                            <item.icon size={20} />
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <button onClick={logout} className="admin-logout-btn">
                        <LogOut size={20} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default AdminSidebar;
