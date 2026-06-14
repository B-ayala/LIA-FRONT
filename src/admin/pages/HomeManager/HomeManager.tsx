import CarouselManager from '../../components/CarouselManager/CarouselManager';
import FeaturedProductsManager from '../../components/FeaturedProductsManager/FeaturedProductsManager';
import './HomeManager.css';

const HomeManager = () => {
    return (
        <div className="admin-home-manager">
            <div className="admin-page-header">
                <h1 className="admin-page-title">Home Manager</h1>
                <p className="admin-page-subtitle">Administra el contenido de la página principal.</p>
            </div>

            <div className="home-manager-grid">
                <CarouselManager />
                <FeaturedProductsManager />
            </div>
        </div>
    );
};

export default HomeManager;
