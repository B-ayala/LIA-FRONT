import { AlertTriangle } from 'lucide-react';
import type { SizeGuide, SizeGuideMeasurementBasis, SizeGuideUnit } from '../../../types/product';
import type { useSizeGuideContent } from '../../../hooks/useSizeGuideContent';
import {
  guideSizesNotForSale,
  guideTableStatus,
  MEASUREMENT_BASIS_TOKEN,
  UNIT_LABELS,
  type GuideTableStatus,
} from '../../../utils/sizeGuideInfo';
import FitReferenceEditor from './FitReferenceEditor';
import NotesListEditor from './NotesListEditor';

type GuideContentState = Pick<ReturnType<typeof useSizeGuideContent>, 'status' | 'content' | 'error' | 'reload'>;

interface SizeGuideInfoEditorProps {
  guide: SizeGuide;
  onChange: (guide: SizeGuide) => void;
  globalContent: GuideContentState;
  productImages: string[];
  /** Opciones de la variante Talle del producto, para avisar si la guía muestra talles que no se venden. */
  variantSizes: string[];
}

const BASIS_OPTIONS: { value: SizeGuideMeasurementBasis | ''; label: string }[] = [
  { value: '', label: 'Sin indicar' },
  { value: 'body', label: 'Medidas corporales' },
  { value: 'garment', label: 'Medidas de la prenda' },
];

const STATUS_MESSAGES: Record<GuideTableStatus, string | null> = {
  empty: 'Sin medidas cargadas: la tienda mostrará que están pendientes y no publicará la tabla.',
  partial: 'Faltan medidas: la tienda mostrará las celdas vacías como "Pendiente".',
  complete: null,
};

/** Unidad, base de las medidas, aclaraciones y referencia de calce de la guía de un producto. */
const SizeGuideInfoEditor = ({ guide, onChange, globalContent, productImages, variantSizes }: SizeGuideInfoEditorProps) => {
  const status = guideTableStatus(guide);
  const notForSale = guideSizesNotForSale(guide, variantSizes);
  const set = (patch: Partial<SizeGuide>) => onChange({ ...guide, ...patch });

  return (
    <div className="size-guide-info">
      {STATUS_MESSAGES[status] && <p className="size-guide-info__notice" role="status">{STATUS_MESSAGES[status]}</p>}
      {notForSale.length > 0 && (
        <p className="size-guide-info__notice size-guide-info__notice--warn" role="status">
          <AlertTriangle size={14} aria-hidden="true" /> La guía muestra talles que este producto no vende: {notForSale.join(', ')}.
          Quitalos o agregalos en la variante Talle para que la información coincida.
        </p>
      )}

      <div className="size-guide-info__row">
        <div className="size-guide-info__field">
          <label htmlFor="size-guide-unit">Unidad de las medidas</label>
          <select id="size-guide-unit" value={guide.unit ?? 'cm'} onChange={(e) => set({ unit: e.target.value as SizeGuideUnit })}>
            {(Object.keys(UNIT_LABELS) as SizeGuideUnit[]).map((unit) => <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>)}
          </select>
        </div>
        <div className="size-guide-info__field">
          <label htmlFor="size-guide-basis">Las medidas corresponden a</label>
          <select
            id="size-guide-basis"
            value={guide.measurementBasis ?? ''}
            onChange={(e) => set({ measurementBasis: (e.target.value || undefined) as SizeGuideMeasurementBasis | undefined })}
          >
            {BASIS_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      <p className="size-guide-info__hint">
        Corporales: las de la persona que usa el talle (tabla del fabricante). De la prenda: medidas tomadas sobre la prenda.
        Si no lo sabés con certeza, dejalo "Sin indicar" y la tienda no afirmará ninguna de las dos.
      </p>

      <GuideNotesSection guide={guide} onChange={onChange} globalContent={globalContent} />

      <details className="size-guide-info__section" open={Boolean(guide.fitReference)}>
        <summary>Referencia de calce (opcional)</summary>
        <FitReferenceEditor value={guide.fitReference ?? {}} onChange={(fitReference) => set({ fitReference })} productImages={productImages} />
      </details>
    </div>
  );
};

interface GuideNotesSectionProps {
  guide: SizeGuide;
  onChange: (guide: SizeGuide) => void;
  globalContent: GuideContentState;
}

const GuideNotesSection = ({ guide, onChange, globalContent }: GuideNotesSectionProps) => {
  const usesGlobal = guide.notes === undefined;

  const toggleGlobal = (useGlobal: boolean) => {
    const next: SizeGuide = { ...guide };
    if (useGlobal) delete next.notes;
    else next.notes = [...globalContent.content.notes];
    onChange(next);
  };

  return (
    <div className="size-guide-info__section">
      <p className="size-guide-info__subtitle">Aclaraciones importantes</p>
      <label className="size-guide-info__check">
        <input type="checkbox" checked={usesGlobal} onChange={(e) => toggleGlobal(e.target.checked)} />
        Usar las aclaraciones globales (Admin › Talles › Textos de la guía)
      </label>
      {usesGlobal ? <GlobalNotesPreview globalContent={globalContent} /> : (
        <>
          <p className="size-guide-info__hint">
            Solo para este producto. Escribí {MEASUREMENT_BASIS_TOKEN} donde va "medidas corporales" o "medidas de la prenda":
            esa aclaración se muestra solo si indicaste a qué corresponden las medidas.
          </p>
          <NotesListEditor notes={guide.notes ?? []} onChange={(notes) => onChange({ ...guide, notes })} idPrefix="product-guide" />
        </>
      )}
    </div>
  );
};

const GlobalNotesPreview = ({ globalContent }: { globalContent: GuideContentState }) => {
  if (globalContent.status === 'loading') return <p className="size-guide-info__hint" role="status">Cargando aclaraciones globales...</p>;
  if (globalContent.status === 'error') {
    return (
      <p className="size-guide-info__notice size-guide-info__notice--warn" role="alert">
        No pudimos cargar las aclaraciones globales. {globalContent.error}{' '}
        <button type="button" className="size-guide-info__link" onClick={globalContent.reload}>Reintentar</button>
      </p>
    );
  }
  if (globalContent.content.notes.length === 0) return <p className="size-guide-info__hint">Las aclaraciones globales están vacías.</p>;
  return (
    <ul className="size-guide-info__preview">
      {globalContent.content.notes.map((note, index) => <li key={index}>{note}</li>)}
    </ul>
  );
};

export default SizeGuideInfoEditor;
