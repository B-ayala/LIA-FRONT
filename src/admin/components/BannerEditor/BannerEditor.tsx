import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ImagePlus, Minus, MousePointerClick, Monitor, Redo2, Save, Smartphone, Type, Undo2 } from 'lucide-react';
import BannerCanvas from '../../../components/common/BannerCanvas/BannerCanvas';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import CloudinaryImagePicker from '../CloudinaryImagePicker/CloudinaryImagePicker';
import {
  BANNER_LIMITS,
  BANNER_REFERENCE_WIDTH,
  createElement,
  duplicateElement,
  isSafeHref,
  isSafeImageUrl,
  type BannerDesign,
  type BannerDevice,
  type BannerElement,
  type BannerElementType,
} from '../../../utils/carouselBanner';
import BannerBackgroundPanel from './BannerBackgroundPanel';
import BannerInspector from './BannerInspector';
import { useBannerGestures } from './useBannerGestures';
import { useBannerHistory } from './useBannerHistory';
import './BannerEditor.css';

const ConfirmationModal = lazy(() => import('../../../components/common/Modal/ConfirmationModal'));

interface BannerEditorProps {
  device: BannerDevice;
  initialDesign: BannerDesign;
  // Un banner recién creado ya trae el diseño de partida: se puede guardar sin tocarlo.
  isNew: boolean;
  onSave: (design: BannerDesign) => Promise<void>;
  onClose: () => void;
}

type PickerTarget = 'element' | 'background' | null;

const CANVAS_ASPECT: Record<BannerDevice, number> = { desktop: 16 / 9, mobile: 1 / 2 };
const DEVICE_LABEL: Record<BannerDevice, string> = { desktop: 'Desktop', mobile: 'Mobile' };

const ADD_TOOLS: readonly { type: BannerElementType; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Texto', icon: Type },
  { type: 'button', label: 'Botón', icon: MousePointerClick },
  { type: 'image', label: 'Foto', icon: ImagePlus },
  { type: 'line', label: 'Línea', icon: Minus },
];

const SAVE_ERROR = 'No pudimos guardar el banner. Revisá tu conexión y reintentá.';

const isTypingTarget = (target: EventTarget): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

// Lo que bloquea el guardado: se valida acá porque el saneado del servidor
// descartaría en silencio un link inválido o una foto vacía.
function findDesignProblem(design: BannerDesign): { id: string; message: string } | null {
  for (const element of design.elements) {
    if (element.type === 'image' && !isSafeImageUrl(element.url)) {
      return { id: element.id, message: 'Hay una foto sin imagen elegida. Elegila o eliminá ese elemento.' };
    }
    if (element.type === 'button' && element.href && !isSafeHref(element.href)) {
      return { id: element.id, message: 'El link de un botón no es válido. Usá una ruta como /products o un link https://.' };
    }
  }
  return null;
}

const patchElementIn = (design: BannerDesign, id: string, patch: Partial<BannerElement>): BannerDesign => ({
  ...design,
  // El cast es seguro: `patch` siempre llega de un control del tipo de ese elemento.
  elements: design.elements.map((element) => (element.id === id ? ({ ...element, ...patch } as BannerElement) : element)),
});

const BannerEditor = ({ device, initialDesign, isNew, onSave, onClose }: BannerEditorProps) => {
  const { design, update, undo, redo, canUndo, canRedo } = useBannerHistory(initialDesign);
  const [initialJson] = useState(() => JSON.stringify(initialDesign));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const isDirty = useMemo(() => JSON.stringify(design) !== initialJson, [design, initialJson]);
  const selectedElement = design.elements.find((element) => element.id === selectedId) ?? null;
  const referenceWidth = BANNER_REFERENCE_WIDTH[device];

  const patchElement = useCallback((id: string, patch: Partial<BannerElement>, key: string) => {
    update((current) => patchElementIn(current, id, patch), key);
  }, [update]);

  const removeElement = useCallback((id: string) => {
    update((current) => ({ ...current, elements: current.elements.filter((element) => element.id !== id) }));
    setSelectedId(null);
  }, [update]);

  const gestures = useBannerGestures({ canvasRef, selectedId, onSelect: setSelectedId, onPatch: patchElement, onRemove: removeElement });

  const requestClose = useCallback(() => {
    if (saving) return;
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  }, [saving, isDirty, onClose]);

  useEffect(() => {
    rootRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  const addElement = (type: BannerElementType) => {
    if (design.elements.length >= BANNER_LIMITS.maxElements) {
      setError(`Un banner admite hasta ${BANNER_LIMITS.maxElements} elementos.`);
      return;
    }
    const element = createElement(type, device);
    update((current) => ({ ...current, elements: [...current.elements, element] }));
    setSelectedId(element.id);
    setError(null);
    if (type === 'image') setPickerTarget('element');
  };

  const duplicateSelected = () => {
    if (!selectedElement || design.elements.length >= BANNER_LIMITS.maxElements) return;
    const copy = duplicateElement(selectedElement);
    update((current) => ({ ...current, elements: [...current.elements, copy] }));
    setSelectedId(copy.id);
  };

  const moveSelectedLayer = (direction: 'front' | 'back') => {
    if (!selectedElement) return;
    update((current) => {
      const others = current.elements.filter((element) => element.id !== selectedElement.id);
      return { ...current, elements: direction === 'front' ? [...others, selectedElement] : [selectedElement, ...others] };
    });
  };

  const patchDesign = useCallback((patch: Partial<BannerDesign>, key: string) => {
    update((current) => ({ ...current, ...patch }), key);
  }, [update]);

  const handlePickedImage = (urls: string[]) => {
    const url = urls[0];
    if (!url || !isSafeImageUrl(url)) {
      setError('No se pudo usar esa imagen. Probá con otra.');
      return;
    }
    if (pickerTarget === 'background') {
      patchDesign({ backgroundImage: url }, 'bg:image');
    } else if (selectedId) {
      patchElement(selectedId, { url } as Partial<BannerElement>, `${selectedId}:url`);
    }
  };

  const handleSave = async () => {
    const problem = findDesignProblem(design);
    if (problem) {
      setSelectedId(problem.id);
      setError(problem.message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(design);
    } catch (saveError) {
      setError(saveError instanceof Error && saveError.message ? saveError.message : SAVE_ERROR);
      setSaving(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !pickerTarget && !confirmDiscard) {
      requestClose();
      return;
    }
    if (isTypingTarget(event.target) || !(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
      event.preventDefault();
      redo();
    }
  };

  const DeviceIcon = device === 'desktop' ? Monitor : Smartphone;

  return (
    <div
      ref={rootRef}
      className="banner-editor"
      role="dialog"
      aria-modal="true"
      aria-label={`Editor de banner para ${DEVICE_LABEL[device]}`}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <header className="be-bar">
        <button type="button" className="be-btn be-btn--ghost" onClick={requestClose} disabled={saving}>
          <ArrowLeft size={18} /> Volver
        </button>
        <h2 className="be-bar__title">
          Editor de banner <span className="be-badge"><DeviceIcon size={14} /> {DEVICE_LABEL[device]}</span>
        </h2>
        <div className="be-bar__actions">
          <button type="button" className="be-icon-btn" onClick={undo} disabled={!canUndo || saving} aria-label="Deshacer" title="Deshacer (Ctrl+Z)">
            <Undo2 size={18} />
          </button>
          <button type="button" className="be-icon-btn" onClick={redo} disabled={!canRedo || saving} aria-label="Rehacer" title="Rehacer (Ctrl+Y)">
            <Redo2 size={18} />
          </button>
          <button type="button" className="be-btn be-btn--primary" onClick={handleSave} disabled={saving || (!isNew && !isDirty)}>
            {saving ? <LiaLoader size="sm" /> : <Save size={16} />} {saving ? 'Guardando…' : 'Guardar banner'}
          </button>
        </div>
      </header>

      {error && <p className="be-error" role="alert">{error}</p>}

      <div className="be-body">
        <div className="be-tools" role="toolbar" aria-label="Agregar elementos">
          <span className="be-tools__label">Agregar</span>
          {ADD_TOOLS.map(({ type, label, icon: Icon }) => (
            <button key={type} type="button" className="be-tool" onClick={() => addElement(type)} aria-label={`Agregar ${label.toLowerCase()}`}>
              <Icon size={18} /> <span>{label}</span>
            </button>
          ))}
        </div>

        <main className="be-stage">
          <div className="be-frame" style={{ aspectRatio: CANVAS_ASPECT[device], ['--be-ratio' as string]: CANVAS_ASPECT[device] }}>
            <BannerCanvas design={design} referenceWidth={referenceWidth} editing={gestures} canvasRef={canvasRef} />
          </div>
          <p className="be-stage__hint">
            Así se ve en {DEVICE_LABEL[device]}. Los textos se achican o agrandan solos según el ancho de la pantalla.
          </p>
        </main>

        <aside className="be-panel" aria-label="Propiedades">
          {selectedElement ? (
            <BannerInspector
              element={selectedElement}
              onPatch={patchElement}
              onPickImage={() => setPickerTarget('element')}
              onDuplicate={duplicateSelected}
              onRemove={() => removeElement(selectedElement.id)}
              onLayer={moveSelectedLayer}
            />
          ) : (
            <BannerBackgroundPanel design={design} onPatch={patchDesign} onPickBackgroundImage={() => setPickerTarget('background')} />
          )}
        </aside>
      </div>

      <CloudinaryImagePicker open={pickerTarget !== null} single onClose={() => setPickerTarget(null)} onSelect={handlePickedImage} />

      <Suspense fallback={null}>
        {confirmDiscard && (
          <ConfirmationModal
            isOpen
            status="info"
            title="¿Salir sin guardar?"
            message="Los cambios de este banner se van a perder."
            actionButtonText="Salir sin guardar"
            cancelButtonText="Seguir editando"
            onActionClick={onClose}
            onClose={() => setConfirmDiscard(false)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default BannerEditor;
