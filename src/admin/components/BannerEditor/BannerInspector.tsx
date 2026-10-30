import { ArrowDownToLine, ArrowUpToLine, Copy, ImagePlus, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { BANNER_LIMITS, isSafeHref, type BannerElement } from '../../../utils/carouselBanner';
import { ColorField, SegmentedField, SliderField, TextField, ToggleField } from './controls';

export type ElementPatch = (id: string, patch: Partial<BannerElement>, key: string) => void;

interface BannerInspectorProps {
  element: BannerElement;
  onPatch: ElementPatch;
  onPickImage: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onLayer: (direction: 'front' | 'back') => void;
}

const ELEMENT_TITLES: Record<BannerElement['type'], string> = {
  text: 'Texto',
  button: 'Botón',
  image: 'Foto',
  line: 'Línea',
};

const WEIGHT_OPTIONS = [
  { value: 400, label: 'Normal' },
  { value: 600, label: 'Seminegrita' },
  { value: 800, label: 'Negrita' },
] as const;

const FONT_OPTIONS = [
  { value: 'sans', label: 'Moderna' },
  { value: 'serif', label: 'Elegante' },
] as const;

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Izq.', ariaLabel: 'Alinear a la izquierda' },
  { value: 'center', label: 'Centro', ariaLabel: 'Centrar' },
  { value: 'right', label: 'Der.', ariaLabel: 'Alinear a la derecha' },
] as const;

const QUARTER_TURN = 90;
const HREF_ERROR = 'Usá una ruta del sitio (/products) o un link que empiece con https://';

// Cada control actualiza una sola propiedad con una clave estable: el historial
// junta los cambios seguidos del mismo control en un único "deshacer".
function makeSetter<T extends BannerElement>(element: T, onPatch: ElementPatch) {
  return <K extends keyof T>(property: K, value: T[K]) =>
    onPatch(element.id, { [property]: value } as Partial<BannerElement>, `${element.id}:${String(property)}`);
}

const TextProps = ({ element, onPatch }: { element: Extract<BannerElement, { type: 'text' }>; onPatch: ElementPatch }) => {
  const set = makeSetter(element, onPatch);
  return (
    <>
      <TextField label="Texto" multiline value={element.text} maxLength={BANNER_LIMITS.maxTextLength} onChange={(value) => set('text', value)} />
      <SliderField label="Tamaño" value={element.fontSize} min={BANNER_LIMITS.minFontSize} max={BANNER_LIMITS.maxFontSize} step={0.1} onChange={(value) => set('fontSize', value)} />
      <SegmentedField label="Grosor" value={element.weight} options={WEIGHT_OPTIONS} onChange={(value) => set('weight', value)} />
      <SegmentedField label="Tipografía" value={element.font} options={FONT_OPTIONS} onChange={(value) => set('font', value)} />
      <SegmentedField label="Alineación" value={element.align} options={ALIGN_OPTIONS} onChange={(value) => set('align', value)} />
      <ColorField label="Color del texto" value={element.color} onChange={(value) => set('color', value)} />
    </>
  );
};

const ButtonProps = ({ element, onPatch }: { element: Extract<BannerElement, { type: 'button' }>; onPatch: ElementPatch }) => {
  const set = makeSetter(element, onPatch);
  const hrefError = element.href && !isSafeHref(element.href) ? HREF_ERROR : undefined;
  return (
    <>
      <TextField label="Texto del botón" value={element.label} maxLength={60} onChange={(value) => set('label', value)} />
      <TextField
        label="A dónde lleva"
        value={element.href}
        placeholder="/products"
        hint="Dejalo vacío si el botón es solo decorativo."
        error={hrefError}
        onChange={(value) => set('href', value)}
      />
      <SliderField label="Tamaño" value={element.fontSize} min={BANNER_LIMITS.minFontSize} max={BANNER_LIMITS.maxFontSize} step={0.1} onChange={(value) => set('fontSize', value)} />
      <ColorField label="Color del botón" value={element.background} onChange={(value) => set('background', value)} />
      <ColorField label="Color del texto" value={element.color} onChange={(value) => set('color', value)} />
    </>
  );
};

interface ImagePropsProps {
  element: Extract<BannerElement, { type: 'image' }>;
  onPatch: ElementPatch;
  onPickImage: () => void;
}

const ImageProps = ({ element, onPatch, onPickImage }: ImagePropsProps) => {
  const set = makeSetter(element, onPatch);
  return (
    <>
      <button type="button" className="be-btn be-btn--outline" onClick={onPickImage}>
        <ImagePlus size={16} /> {element.url ? 'Cambiar foto' : 'Elegir foto'}
      </button>
      <TextField label="Descripción de la foto" value={element.alt} maxLength={120} hint="La leen los lectores de pantalla." onChange={(value) => set('alt', value)} />
      <SliderField label="Alto" value={Math.round(element.h)} min={BANNER_LIMITS.minWidth} max={100} step={1} unit="%" onChange={(value) => set('h', value)} />
      <SliderField label="Bordes redondeados" value={element.radius} min={0} max={50} step={1} unit="%" onChange={(value) => set('radius', value)} />
      <ToggleField label="Marco blanco con sombra (estilo polaroid)" checked={element.framed} onChange={(value) => set('framed', value)} />
    </>
  );
};

const LineProps = ({ element, onPatch }: { element: Extract<BannerElement, { type: 'line' }>; onPatch: ElementPatch }) => {
  const set = makeSetter(element, onPatch);
  return (
    <>
      <SliderField label="Grosor" value={element.thickness} min={0.05} max={2} step={0.05} onChange={(value) => set('thickness', value)} />
      <ColorField label="Color" value={element.color} onChange={(value) => set('color', value)} />
      <button
        type="button"
        className="be-btn be-btn--outline"
        onClick={() => set('rotation', element.rotation === QUARTER_TURN ? 0 : QUARTER_TURN)}
      >
        <RotateCw size={16} /> {element.rotation === QUARTER_TURN ? 'Pasar a horizontal' : 'Pasar a vertical'}
      </button>
    </>
  );
};

const renderSpecificProps = (element: BannerElement, onPatch: ElementPatch, onPickImage: () => void) => {
  switch (element.type) {
    case 'text': return <TextProps element={element} onPatch={onPatch} />;
    case 'button': return <ButtonProps element={element} onPatch={onPatch} />;
    case 'image': return <ImageProps element={element} onPatch={onPatch} onPickImage={onPickImage} />;
    case 'line': return <LineProps element={element} onPatch={onPatch} />;
  }
};

const BannerInspector = ({ element, onPatch, onPickImage, onDuplicate, onRemove, onLayer }: BannerInspectorProps) => {
  const set = makeSetter(element, onPatch);

  return (
    <div className="be-panel__section">
      <div className="be-panel__heading">
        <h3>Editando: {ELEMENT_TITLES[element.type].toLowerCase()}</h3>
        <div className="be-panel__actions">
          <button type="button" className="be-icon-btn" onClick={onDuplicate} aria-label="Duplicar elemento" title="Duplicar">
            <Copy size={16} />
          </button>
          <button type="button" className="be-icon-btn be-icon-btn--danger" onClick={onRemove} aria-label="Eliminar elemento" title="Eliminar">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {renderSpecificProps(element, onPatch, onPickImage)}

      <details className="be-details" open>
        <summary>Tamaño, giro y capas</summary>
        <SliderField label="Ancho" value={Math.round(element.w)} min={BANNER_LIMITS.minWidth} max={BANNER_LIMITS.maxWidth} step={1} unit="%" onChange={(value) => set('w', value)} />
        <SliderField label="Giro" value={Math.round(element.rotation)} min={-180} max={180} step={1} unit="°" onChange={(value) => set('rotation', value)} />
        {element.rotation !== 0 && (
          <button type="button" className="be-btn be-btn--outline" onClick={() => set('rotation', 0)}>
            <RotateCcw size={16} /> Enderezar (0°)
          </button>
        )}
        <div className="be-row">
          <button type="button" className="be-btn be-btn--outline" onClick={() => onLayer('front')}>
            <ArrowUpToLine size={16} /> Al frente
          </button>
          <button type="button" className="be-btn be-btn--outline" onClick={() => onLayer('back')}>
            <ArrowDownToLine size={16} /> Atrás
          </button>
        </div>
      </details>

      <p className="be-field__hint">
        Arrastralo en el lienzo o usá las flechas del teclado (Shift = salto grande).
      </p>
    </div>
  );
};

export default BannerInspector;
