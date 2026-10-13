import { useId } from 'react';
import { Wand2, Check, AlertTriangle } from 'lucide-react';
import { BANNER_PALETTE } from '../../../utils/carouselBanner';
import { contrastLevel, contrastRatio, hexToRgb, type ContrastLevel } from '../../../utils/navbarColor';
import type { Backdrop } from './useBackdropColor';
import './NavbarColor.css';

interface NavbarColorControlProps {
  // null = usar el color global de Config. del sitio.
  value: string | null;
  onChange: (color: string | null) => void;
  backdrop: Backdrop;
  onAutoPick: () => void;
}

const LEVEL_TEXT: Record<ContrastLevel, string> = {
  good: 'Se lee muy bien',
  fair: 'Se lee justo: probá un color más fuerte',
  poor: 'Casi no se lee: probá otro color',
};

const ContrastNote = ({ value, backdrop }: { value: string | null; backdrop: Backdrop }) => {
  if (backdrop.status === 'loading') {
    return <p className="nc-note" role="status">Analizando los colores de la imagen…</p>;
  }
  if (backdrop.status === 'unavailable' || !backdrop.rgb) {
    return <p className="nc-note">No pudimos analizar la imagen. Guiate por la vista previa.</p>;
  }
  const rgb = value ? hexToRgb(value) : null;
  if (!rgb) {
    return <p className="nc-note">Se usa el color general del menú (Config. del sitio).</p>;
  }
  const ratio = contrastRatio(rgb, backdrop.rgb);
  const level = contrastLevel(ratio);
  return (
    <p className={`nc-note nc-note--${level}`} role="status">
      {level === 'good' ? <Check size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
      {LEVEL_TEXT[level]} ({ratio.toFixed(1)}:1)
    </p>
  );
};

const NavbarColorControl = ({ value, onChange, backdrop, onAutoPick }: NavbarColorControlProps) => {
  const labelId = useId();
  const customId = useId();

  return (
    <div className="nc-control">
      <span className="nc-label" id={labelId}>Color del menú sobre este slide</span>

      <div className="nc-swatches" role="group" aria-labelledby={labelId}>
        {BANNER_PALETTE.map((color) => (
          <button
            key={color.value}
            type="button"
            className={`nc-swatch${color.value === value ? ' is-active' : ''}`}
            style={{ background: color.value }}
            aria-label={color.label}
            aria-pressed={color.value === value}
            title={color.label}
            onClick={() => onChange(color.value)}
          />
        ))}
        <label className="nc-swatch nc-swatch--custom" htmlFor={customId} title="Elegir otro color">
          <span className="nc-visually-hidden">Color personalizado</span>
          <input id={customId} type="color" value={value ?? '#333333'} onChange={(event) => onChange(event.target.value)} />
        </label>
      </div>

      <div className="nc-actions">
        <button type="button" className="nc-btn" onClick={onAutoPick} disabled={!backdrop.rgb}>
          <Wand2 size={16} /> Elegir el más legible
        </button>
        <button type="button" className="nc-btn" onClick={() => onChange(null)} aria-pressed={value === null} disabled={value === null}>
          Usar el del sitio
        </button>
      </div>

      <ContrastNote value={value} backdrop={backdrop} />
    </div>
  );
};

export default NavbarColorControl;
