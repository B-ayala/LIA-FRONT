import logoImg from '../../../assets/img/logo.jpeg';
import './InitialLoadingScreen.css';

const InitialLoadingScreen = () => {
  return (
    <div className="initial-loading-screen" role="status" aria-live="polite" aria-label="Cargando contenido inicial">
      <div className="initial-loading-screen__logo-wrap">
        <div className="initial-loading-screen__ring" aria-hidden="true">
          <span className="initial-loading-screen__bubble" />
        </div>
        <img src={logoImg} alt="LIA" className="initial-loading-screen__logo" />
      </div>
    </div>
  );
};

export default InitialLoadingScreen;
