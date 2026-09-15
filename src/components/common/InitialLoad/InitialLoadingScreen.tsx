import logoImg from '../../../assets/img/logo.jpeg';
import './InitialLoadingScreen.css';

const ARROW_COUNT = 8;
const RING_RADIUS = 46;
const CENTER = 60;

const InitialLoadingScreen = () => {
  return (
    <div className="initial-loading-screen" role="status" aria-live="polite" aria-label="Cargando contenido inicial">
      <div className="initial-loading-screen__logo-wrap">
        <svg
          className="initial-loading-screen__ring"
          viewBox="0 0 120 120"
          aria-hidden="true"
          focusable="false"
        >
          {Array.from({ length: ARROW_COUNT }, (_, i) => {
            const angle = (360 / ARROW_COUNT) * i;
            return (
              <g
                key={i}
                transform={`rotate(${angle} ${CENTER} ${CENTER}) translate(${CENTER} ${CENTER - RING_RADIUS})`}
                opacity={0.35 + (0.65 * i) / ARROW_COUNT}
              >
                <path
                  d="M -5 -6 L 5 0 L -5 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </svg>
        <img src={logoImg} alt="LIA" className="initial-loading-screen__logo" />
      </div>
    </div>
  );
};

export default InitialLoadingScreen;
