import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { BANNER_LIMITS, type BannerElement } from '../../../utils/carouselBanner';
import type { BannerCanvasEditing } from '../../../components/common/BannerCanvas/BannerCanvas';

// Cerca del centro (50%) el elemento "se pega" y se muestra la guía.
const SNAP_THRESHOLD = 1.2;
const CENTER = 50;
const NUDGE_STEP = 0.5;
const NUDGE_STEP_LARGE = 2;
const HALF = 2;

type Gesture =
  | { mode: 'move'; id: string; startX: number; startY: number; origX: number; origY: number; width: number; height: number }
  | { mode: 'resize'; id: string; startX: number; startY: number; origW: number; origH: number; rotation: number; width: number };

interface UseBannerGesturesArgs {
  canvasRef: RefObject<HTMLDivElement | null>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPatch: (id: string, patch: Partial<BannerElement>, key: string) => void;
  onRemove: (id: string) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snapToCenter = (value: number) => (Math.abs(value - CENTER) <= SNAP_THRESHOLD ? CENTER : value);

const ARROW_DELTAS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export function useBannerGestures({ canvasRef, selectedId, onSelect, onPatch, onRemove }: UseBannerGesturesArgs): BannerCanvasEditing {
  const gestureRef = useRef<Gesture | null>(null);
  const [guideX, setGuideX] = useState(false);
  const [guideY, setGuideY] = useState(false);

  const onElementPointerDown = useCallback((event: PointerEvent<HTMLElement>, element: BannerElement) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || event.button !== 0) return;
    // No debe llegar al fondo del lienzo, que deselecciona.
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(element.id);
    gestureRef.current = {
      mode: 'move', id: element.id, startX: event.clientX, startY: event.clientY,
      origX: element.x, origY: element.y, width: rect.width, height: rect.height,
    };
  }, [canvasRef, onSelect]);

  const onResizePointerDown = useCallback((event: PointerEvent<HTMLElement>, element: BannerElement) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = {
      mode: 'resize', id: element.id, startX: event.clientX, startY: event.clientY,
      origW: element.w, origH: element.type === 'image' ? element.h : 0, rotation: element.rotation, width: rect.width,
    };
  }, [canvasRef]);

  // Idempotentes: calculan desde el punto de partida, así que da igual que el
  // mismo movimiento llegue dos veces (el handle burbujea hacia su elemento).
  const onElementPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (gesture.mode === 'move') {
      const x = snapToCenter(clamp(gesture.origX + (deltaX / gesture.width) * 100, 0, 100));
      const y = snapToCenter(clamp(gesture.origY + (deltaY / gesture.height) * 100, 0, 100));
      setGuideX(x === CENTER);
      setGuideY(y === CENTER);
      onPatch(gesture.id, { x, y }, `drag:${gesture.id}`);
      return;
    }

    // El ancho crece desde el centro: el handle está en el borde, así que el
    // desplazamiento sobre el eje del elemento se duplica.
    const radians = (gesture.rotation * Math.PI) / 180;
    const alongAxis = deltaX * Math.cos(radians) + deltaY * Math.sin(radians);
    const w = clamp(gesture.origW + HALF * (alongAxis / gesture.width) * 100, BANNER_LIMITS.minWidth, BANNER_LIMITS.maxWidth);
    const patch: Partial<BannerElement> = gesture.origH > 0
      ? { w, h: clamp(gesture.origH * (w / gesture.origW), BANNER_LIMITS.minWidth, 100) }
      : { w };
    onPatch(gesture.id, patch, `resize:${gesture.id}`);
  }, [onPatch]);

  const onElementPointerUp = useCallback(() => {
    gestureRef.current = null;
    setGuideX(false);
    setGuideY(false);
  }, []);

  const onElementKeyDown = useCallback((event: KeyboardEvent<HTMLElement>, element: BannerElement) => {
    if (event.target !== event.currentTarget) return;
    const delta = ARROW_DELTAS[event.key];

    if (delta) {
      event.preventDefault();
      const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;
      onSelect(element.id);
      onPatch(element.id, {
        x: clamp(element.x + delta[0] * step, 0, 100),
        y: clamp(element.y + delta[1] * step, 0, 100),
      }, `nudge:${element.id}`);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      onRemove(element.id);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(element.id);
    } else if (event.key === 'Escape') {
      onSelect(null);
    }
  }, [onSelect, onPatch, onRemove]);

  const onBackgroundPointerDown = useCallback(() => onSelect(null), [onSelect]);

  return {
    selectedId,
    guides: { x: guideX, y: guideY },
    onBackgroundPointerDown,
    onElementPointerDown,
    onElementPointerMove,
    onElementPointerUp,
    onElementKeyDown,
    onResizePointerDown,
  };
}
