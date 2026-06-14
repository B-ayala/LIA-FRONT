import { Package, AlertTriangle, Users, Tag } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import './Dashboard.css';

const Dashboard = () => {
    const products = useAdminStore(state => state.products);
    const users = useAdminStore(state => state.users);

    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stock <= 5).length;
    const totalUsers = users.length;
    // "Promo activa" = producto activo con descuento numérico > 0. El campo
    // `hasPromo` original no existe en el schema actual — se derivó del
    // descuento cuando se migró a la tabla `productos`.
    const activePromos = products.filter(p => p.status === 'active' && (p.discount ?? 0) > 0).length;

    const cards = [
        { title: 'Total Productos', value: totalProducts, icon: Package, color: 'bg-blue-100 text-blue-600', iconColor: '#2563eb', bgColor: '#dbeafe' },
        { title: 'Bajo Stock', value: lowStockProducts, icon: AlertTriangle, color: 'bg-orange-100 text-orange-600', iconColor: '#ea580c', bgColor: '#ffedd5' },
        { title: 'Usuarios', value: totalUsers, icon: Users, color: 'bg-green-100 text-green-600', iconColor: '#16a34a', bgColor: '#dcfce7' },
        { title: 'Promociones Activas', value: activePromos, icon: Tag, color: 'bg-purple-100 text-purple-600', iconColor: '#9333ea', bgColor: '#f3e8ff' },
    ];

    return (
        <div className="admin-dashboard">
            <h1 className="admin-page-title">Dashboard</h1>
            <p className="admin-page-subtitle">Bienvenido al panel de administración.</p>

            <div className="dashboard-grid">
                {cards.map((card, index) => (
                    <div key={index} className="dashboard-card">
                        <div className="dashboard-card-icon" style={{ backgroundColor: card.bgColor, color: card.iconColor }}>
                            <card.icon size={24} />
                        </div>
                        <div className="dashboard-card-content">
                            <h3>{card.title}</h3>
                            <p>{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-recent-section">
                <h2>Actividad Reciente</h2>
                <div className="dashboard-empty-state">
                    No hay actividad reciente para mostrar.
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
