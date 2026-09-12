import LiaLoader from '../LiaLoader/LiaLoader';
import './NavigationLoadingScreen.css';

interface NavigationLoadingScreenProps {
  isExiting?: boolean;
}

const NavigationLoadingScreen = ({ isExiting = false }: NavigationLoadingScreenProps) => {
  return (
    <div
      className={`navigation-loading-screen ${isExiting ? 'exit' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Cargando nueva sección"
    >
      <div className="navigation-loading-screen__content">
        <LiaLoader size="lg" />
        <p className="navigation-loading-screen__text">Cargando...</p>
      </div>
    </div>
  );
};

export default NavigationLoadingScreen;
