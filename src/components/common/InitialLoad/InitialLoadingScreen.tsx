import LiaLoader from '../LiaLoader/LiaLoader';
import './InitialLoadingScreen.css';

const InitialLoadingScreen = () => {
  return (
    <div className="initial-loading-screen" role="status" aria-live="polite" aria-label="Cargando contenido inicial">
      <div className="initial-loading-screen__glow initial-loading-screen__glow--left" />
      <div className="initial-loading-screen__glow initial-loading-screen__glow--right" />

      <div className="initial-loading-screen__card">
        <div className="initial-loading-screen__icon-shell">
          <LiaLoader size="xl" />
        </div>

        <div className="initial-loading-screen__copy">
                      <h1>LIA</h1>
          <p>Preparando tu próxima prenda favorita</p>
        </div>

        <div className="initial-loading-screen__progress" aria-hidden="true">
          <span className="initial-loading-screen__progress-bar" />
        </div>
      </div>
    </div>
  );
};

export default InitialLoadingScreen;