import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { SizeGuide, SizeGuideFitReferenceMode, SizeGuideMeasurementBasis, SizeGuideUnit } from '../../../types/product';
import type { useSizeGuideContent } from '../../../hooks/useSizeGuideContent';
import {
  guideSizesNotForSale,
  guideTableStatus,
  MEASUREMENT_BASIS_TOKEN,
  visibleFitReference,
  type GuideTableStatus,
} from '../../../utils/sizeGuideInfo';
import { buildCloudinaryUrl } from '../../../utils/cloudinary';
import { GLOBAL_GUIDE_PATH } from './sizeGuideCatalog';
import ChoiceGroup from './ChoiceGroup';
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

type BasisChoice = SizeGuideMeasurementBasis | 'unknown';
type NotesChoice = 'global' | 'custom';
type FitChoice = 'global' | SizeGuideFitReferenceMode;

const UNIT_OPTIONS: { value: SizeGuideUnit; label: string }[] = [
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
];

const BASIS_OPTIONS: { value: BasisChoice; label: string }[] = [
  { value: 'body', label: 'Del cuerpo' },
  { value: 'garment', label: 'De la prenda' },
  { value: 'unknown', label: 'No sé' },
];

const NOTES_OPTIONS: { value: NotesChoice; label: string }[] = [
  { value: 'global', label: 'Las generales' },
  { value: 'custom', label: 'Propias' },
];

const STATUS_MESSAGES: Record<GuideTableStatus, string | null> = {
  empty: 'Todavía no cargaste medidas: el cliente verá "medidas pendientes" en lugar de la tabla.',
  partial: 'Faltan algunas medidas: el cliente las verá como "Pendiente".',
  complete: null,
};

const fitChoiceOf = (guide: SizeGuide): FitChoice => {
  if (guide.fitReferenceMode) return guide.fitReferenceMode;
  return guide.type === 'calzado' ? 'hidden' : 'global';
};

/** Unidad, base de las medidas y qué aclaraciones y modelo acompañan la guía de un producto. */
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
        </p>
      )}

      <div className="size-guide-info__choices">
        <ChoiceGroup
          name="size-guide-unit"
          legend="Unidad"
          options={UNIT_OPTIONS}
          value={guide.unit ?? 'cm'}
          onChange={(unit) => set({ unit })}
        />
        <ChoiceGroup
          name="size-guide-basis"
          legend="Las medidas son"
          options={BASIS_OPTIONS}
          value={guide.measurementBasis ?? 'unknown'}
          onChange={(basis) => set({ measurementBasis: basis === 'unknown' ? undefined : basis })}
        />
      </div>
      <p className="size-guide-info__hint">
        "Del cuerpo" si copiaste la tabla del fabricante; "De la prenda" si mediste la prenda. Con "No sé" la tienda no afirma ninguna.
      </p>

      <div className="size-guide-info__extras">
        <div className="size-guide-info__extras-head">
          <p className="size-guide-info__subtitle">Qué más ve el cliente</p>
          <Link to={GLOBAL_GUIDE_PATH} target="_blank" rel="noopener" className="size-guide-info__link">
            Editar lo general <ExternalLink size={13} aria-hidden="true" />
          </Link>
        </div>
        <NotesBlock guide={guide} onChange={onChange} globalContent={globalContent} />
        <FitBlock guide={guide} onChange={onChange} globalContent={globalContent} productImages={productImages} />
      </div>
    </div>
  );
};

interface BlockProps {
  guide: SizeGuide;
  onChange: (guide: SizeGuide) => void;
  globalContent: GuideContentState;
}

const GlobalState = ({ globalContent, children }: { globalContent: GuideContentState; children: ReactNode }) => {
  if (globalContent.status === 'loading' || globalContent.status === 'idle') {
    return <p className="size-guide-info__hint" role="status">Cargando lo general...</p>;
  }
  if (globalContent.status === 'error') {
    return (
      <p className="size-guide-info__notice size-guide-info__notice--warn" role="alert">
        No pudimos cargar lo general. {globalContent.error}{' '}
        <button type="button" className="size-guide-info__link" onClick={globalContent.reload}>Reintentar</button>
      </p>
    );
  }
  return <>{children}</>;
};

const NotesBlock = ({ guide, onChange, globalContent }: BlockProps) => {
  const choice: NotesChoice = guide.notes === undefined ? 'global' : 'custom';
  const globalNotes = globalContent.content.notes;

  const change = (next: NotesChoice) => {
    const updated: SizeGuide = { ...guide };
    if (next === 'global') delete updated.notes;
    else updated.notes = [...globalNotes];
    onChange(updated);
  };

  return (
    <div className="size-guide-info__block">
      <ChoiceGroup name="size-guide-notes" legend="Aclaraciones" options={NOTES_OPTIONS} value={choice} onChange={change} />
      {choice === 'global' ? (
        <GlobalState globalContent={globalContent}>
          <p className="size-guide-info__summary">
            {globalNotes.length === 0 ? 'Las aclaraciones generales están vacías: no se muestra este bloque.' : `Se muestran las ${globalNotes.length} aclaraciones generales.`}
          </p>
        </GlobalState>
      ) : (
        <>
          <p className="size-guide-info__hint">
            Solo para este producto. Escribí {MEASUREMENT_BASIS_TOKEN} donde va "medidas corporales" o "de la prenda".
          </p>
          <NotesListEditor notes={guide.notes ?? []} onChange={(notes) => onChange({ ...guide, notes })} idPrefix="product-guide" />
        </>
      )}
    </div>
  );
};

const FitBlock = ({ guide, onChange, globalContent, productImages }: BlockProps & { productImages: string[] }) => {
  const choice = fitChoiceOf(guide);
  const isFootwear = guide.type === 'calzado';
  const options: { value: FitChoice; label: string }[] = [
    ...(isFootwear ? [] : [{ value: 'global' as const, label: 'La general' }]),
    { value: 'custom', label: 'Propia' },
    { value: 'hidden', label: 'No mostrar' },
  ];

  const change = (next: FitChoice) => {
    const updated: SizeGuide = { ...guide };
    if (next === 'global') delete updated.fitReferenceMode;
    else updated.fitReferenceMode = next;
    if (next === 'custom' && !updated.fitReference) updated.fitReference = { ...globalContent.content.fitReference };
    onChange(updated);
  };

  return (
    <div className="size-guide-info__block">
      <ChoiceGroup name="size-guide-fit" legend="Modelo de referencia" options={options} value={choice} onChange={change} />
      {choice === 'global' && (
        <GlobalState globalContent={globalContent}>
          <GlobalFitSummary globalContent={globalContent} />
        </GlobalState>
      )}
      {choice === 'custom' && (
        <>
          <p className="size-guide-info__hint">Solo con datos reales de la modelo que aparece con esta prenda. Lo vacío no se muestra.</p>
          <FitReferenceEditor
            idPrefix="product-fit"
            value={guide.fitReference ?? {}}
            onChange={(fitReference) => onChange({ ...guide, fitReference })}
            productImages={productImages}
          />
        </>
      )}
      {choice === 'hidden' && isFootwear && guide.fitReferenceMode === undefined && (
        <p className="size-guide-info__summary">En calzado la modelo general no se muestra.</p>
      )}
    </div>
  );
};

const GlobalFitSummary = ({ globalContent }: { globalContent: GuideContentState }) => {
  const fit = visibleFitReference(globalContent.content.fitReference);
  if (!fit) return <p className="size-guide-info__summary">Todavía no cargaste la modelo general: no se muestra nada.</p>;
  const parts = [
    fit.height && `mide ${fit.height}`,
    ...fit.sizes.map(({ label, value }) => `${label.toLowerCase()}: ${value}`),
  ].filter(Boolean);
  return (
    <div className="size-guide-info__fit-summary">
      {fit.image && <img src={buildCloudinaryUrl(fit.image, { width: 96, height: 120, gravity: 'auto' })} alt="" />}
      <p className="size-guide-info__summary">Modelo general{parts.length > 0 ? ` — ${parts.join(' · ')}` : ''}.</p>
    </div>
  );
};

export default SizeGuideInfoEditor;
