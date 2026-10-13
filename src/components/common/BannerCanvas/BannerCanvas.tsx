import type { CSSProperties, KeyboardEvent, PointerEvent, Ref } from 'react';
import { buildBannerImageUrl, type BannerDesign, type BannerElement } from '../../../utils/carouselBanner';
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

const BannerCanvas = ({ design, referenceWidth, editing, canvasRef }: BannerCanvasProps) => (
  <div
    ref={canvasRef}
    className={`banner-canvas${editing ? ' banner-canvas--editing' : ''}`}
    style={backgroundStyle(design)}
    onPointerDown={editing?.onBackgroundPointerDown}
  >
    {design.backgroundImage && (
      <img
        className="banner-canvas__bg-image"
        src={buildBannerImageUrl(design.backgroundImage, 100, referenceWidth)}
        alt=""
        draggable={false}
        decoding="async"
      />
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

export default BannerCanvas;
