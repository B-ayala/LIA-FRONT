import { ImagePlus, Trash2 } from 'lucide-react';
import { BANNER_LIMITS, type BannerDesign } from '../../../utils/carouselBanner';
import { ColorField, SliderField, ToggleField } from './controls';

type DesignPatch = (patch: Partial<BannerDesign>, key: string) => void;

interface BannerBackgroundPanelProps {
  design: BannerDesign;
  onPatch: DesignPatch;
  onPickBackgroundImage: () => void;
}

const DEFAULT_GRADIENT_END = '#d4c9e0';
const OVERLAY_STEP = 0.05;

const BannerBackgroundPanel = ({ design, onPatch, onPickBackgroundImage }: BannerBackgroundPanelProps) => (
  <div className="be-panel__section">
    <div className="be-panel__heading">
      <h3>Fondo del banner</h3>
    </div>
    <p className="be-field__hint">Hacé click en un elemento del lienzo para editarlo.</p>

    <ColorField label="Color de fondo" value={design.background} onChange={(value) => onPatch({ background: value }, 'bg:color')} />

    <ToggleField
      label="Degradé hacia otro color"
      checked={design.gradientTo !== null}
      onChange={(checked) => onPatch({ gradientTo: checked ? DEFAULT_GRADIENT_END : null }, 'bg:gradient-toggle')}
    />
    {design.gradientTo !== null && (
      <ColorField label="Color final del degradé" value={design.gradientTo} onChange={(value) => onPatch({ gradientTo: value }, 'bg:gradient')} />
    )}

    <div className="be-field">
      <span className="be-field__label">Foto de fondo (opcional)</span>
      <div className="be-row">
        <button type="button" className="be-btn be-btn--outline" onClick={onPickBackgroundImage}>
          <ImagePlus size={16} /> {design.backgroundImage ? 'Cambiar foto' : 'Elegir foto'}
        </button>
        {design.backgroundImage && (
          <button
            type="button"
            className="be-btn be-btn--outline be-btn--danger"
            onClick={() => onPatch({ backgroundImage: null, overlay: 0 }, 'bg:image')}
          >
            <Trash2 size={16} /> Quitar
          </button>
        )}
      </div>
    </div>
    {design.backgroundImage && (
      <SliderField
        label="Oscurecer la foto (para que se lea el texto)"
        value={design.overlay}
        min={0}
        max={BANNER_LIMITS.maxOverlay}
        step={OVERLAY_STEP}
        onChange={(value) => onPatch({ overlay: value }, 'bg:overlay')}
      />
    )}
  </div>
);

export default BannerBackgroundPanel;
