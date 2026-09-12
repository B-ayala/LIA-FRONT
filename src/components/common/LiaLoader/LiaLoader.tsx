import { GiClothes } from 'react-icons/gi';
import './LiaLoader.css';

export type LiaLoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LiaLoaderVariant = 'bare' | 'section' | 'overlay' | 'fullscreen';

interface LiaLoaderProps {
  /** Tamaño del ícono + anillo. Default: 'md'. */
  size?: LiaLoaderSize;
  /**
   * 'bare': solo el ícono + anillo, para botones/inputs/badges.
   * 'section': ocupa el espacio de una sección/card/tabla sin overlay (reserva alto mínimo).
   * 'overlay': overlay absoluto sobre un contenedor `position: relative` (modales, paneles).
   * 'fullscreen': overlay fijo a toda la pantalla (carga inicial de la app, navegación entre rutas).
   * Default: 'bare'.
   */
  variant?: LiaLoaderVariant;
  /** Texto opcional debajo del ícono (no se muestra en variant="bare"). */
  label?: string;
  className?: string;
}

const LiaLoader = ({ size = 'md', variant = 'bare', label, className = '' }: LiaLoaderProps) => {
  const mark = (
    <span className={`lia-loader__mark lia-loader__mark--${size}`}>
      <span className="lia-loader__ring" />
      <GiClothes className="lia-loader__icon" />
    </span>
  );

  if (variant === 'bare') {
    return (
      <span
        className={`lia-loader lia-loader--bare ${className}`}
        role="status"
        aria-live="polite"
        aria-label={label ?? 'Cargando'}
      >
        {mark}
      </span>
    );
  }

  return (
    <div
      className={`lia-loader lia-loader--${variant} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Cargando'}
    >
      {mark}
      {label && <p className="lia-loader__label">{label}</p>}
    </div>
  );
};

export default LiaLoader;
