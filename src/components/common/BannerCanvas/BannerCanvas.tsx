import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type Ref } from 'react';
import { buildBannerImageUrl, type BannerDesign, type BannerElement } from '../../../utils/carouselBanner';
import { isImagePreloaded } from '../../../utils/preloadImage';
import LiaLoader from '../LiaLoader/LiaLoader';
import BannerElementView from './BannerElementView';
import './BannerCanvas.css';

// Handlers que el editor del admin inyecta; el carrusel público no los pasa y
// obtiene el banner de solo lectura.
export interface BannerCanvasEditing {
  selectedId: string | null;
  guides: { x: boolean; y: boolean };
  onBackgroundPointerDown: () => void;
  onElementPointerDown: (event: PointerEvent<HTMLElement>, element: BannerElement) => void;
  onElementPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onElementPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onElementKeyDown: (event: KeyboardEvent<HTMLElement>, element: BannerElement) => void;
  onResizePointerDown: (event: PointerEvent<HTMLElement>, element: BannerElement) => void;
}

interface BannerCanvasProps {
  design: BannerDesign;
  referenceWidth: number;
  editing?: BannerCanvasEditing;
  canvasRef?: Ref<HTMLDivElement>;
}

const BACKGROUND_LOADING_LABEL = 'Preparando la mejor moda para vos';

const ELEMENT_LABELS: Record<BannerElement['type'], string> = {
  text: 'Texto',
  button: 'Botón',
  image: 'Foto',
  line: 'Línea',
};

const backgroundStyle = (design: BannerDesign): CSSProperties => ({
  background: design.gradientTo
    ? `linear-gradient(135deg, ${design.background}, ${design.gradientTo})`
    : design.background,
});

const positionStyle = (element: BannerElement): CSSProperties => ({
  left: `${element.x}%`,
  top: `${element.y}%`,
  width: `${element.w}%`,
  height: element.type === 'image' ? `${element.h}%` : undefined,
  transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
});

const describe = (element: BannerElement): string => {
  if (element.type === 'text') return `${ELEMENT_LABELS.text}: ${element.text.slice(0, 40)}`;
  if (element.type === 'button') return `${ELEMENT_LABELS.button}: ${element.label}`;
  return ELEMENT_LABELS[element.type];
};

const BannerCanvas = ({ design, referenceWidth, editing, canvasRef }: BannerCanvasProps) => {
  const backgroundSrc = design.backgroundImage ? buildBannerImageUrl(design.backgroundImage, 100, referenceWidth) : null;
  const [loadedSrc, setLoadedSrc] = useState<string | null>(() =>
    backgroundSrc && isImagePreloaded(backgroundSrc) ? backgroundSrc : null,
  );
  // Los textos suelen ser claros y se leen sobre la foto: sin ella quedan
  // blancos sobre el color de fondo y parecen haber desaparecido. En el editor
  // no se espera, para poder trabajar sin foto cargada.
  const isWaitingBackground = !editing && backgroundSrc !== null && loadedSrc !== backgroundSrc;
  const markBackgroundLoaded = () => setLoadedSrc(backgroundSrc);
  const className = [
    'banner-canvas',
    editing && 'banner-canvas--editing',
    isWaitingBackground && 'banner-canvas--waiting',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={canvasRef}
      className={className}
      style={backgroundStyle(design)}
      onPointerDown={editing?.onBackgroundPointerDown}
    >
      {backgroundSrc && (
        <img
          className="banner-canvas__bg-image"
          src={backgroundSrc}
          alt=""
          draggable={false}
          decoding="async"
          onLoad={markBackgroundLoaded}
          onError={markBackgroundLoaded}
        />
      )}
      {isWaitingBackground && (
        <div className="banner-canvas__loading">
          <LiaLoader size="lg" variant="section" label={BACKGROUND_LOADING_LABEL} />
        </div>
      )}
      {design.overlay > 0 && (
        <div className="banner-canvas__overlay" style={{ background: `rgba(0, 0, 0, ${design.overlay})` }} />
      )}

      {design.elements.map((element) => {
        const isSelected = editing?.selectedId === element.id;

        return (
          <div
            key={element.id}
            className={`banner-el banner-el--${element.type}${isSelected ? ' banner-el--selected' : ''}`}
            style={positionStyle(element)}
            {...(editing && {
              tabIndex: 0,
              role: 'button',
              'aria-label': describe(element),
              'aria-pressed': isSelected,
              onPointerDown: (event: PointerEvent<HTMLElement>) => editing.onElementPointerDown(event, element),
              onPointerMove: editing.onElementPointerMove,
              onPointerUp: editing.onElementPointerUp,
              onPointerCancel: editing.onElementPointerUp,
              onKeyDown: (event: KeyboardEvent<HTMLElement>) => editing.onElementKeyDown(event, element),
            })}
          >
            <BannerElementView element={element} referenceWidth={referenceWidth} interactive={!editing} />
            {editing && isSelected && (
              <span
                className="banner-el__handle"
                aria-hidden="true"
                onPointerDown={(event) => editing.onResizePointerDown(event, element)}
                onPointerMove={editing.onElementPointerMove}
                onPointerUp={editing.onElementPointerUp}
                onPointerCancel={editing.onElementPointerUp}
              />
            )}
          </div>
        );
      })}

      {editing?.guides.x && <div className="banner-guide banner-guide--vertical" />}
      {editing?.guides.y && <div className="banner-guide banner-guide--horizontal" />}
    </div>
  );
};

export default BannerCanvas;
