import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, RefreshCw, Save } from 'lucide-react';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import NotesListEditor from '../../components/SizeGuideEditor/NotesListEditor';
import FitReferenceEditor from '../../components/SizeGuideEditor/FitReferenceEditor';
import { HowToMeasureSection, NotesSection } from '../../../components/common/SizeGuide/SizeGuideView';
import FitReferenceCard from '../../../components/common/SizeGuide/FitReferenceCard';
import { useSizeGuideContent } from '../../../hooks/useSizeGuideContent';
import { SIZE_GUIDE_CONTENT_KEY } from '../../../services/sizeGuideContentService';
import { saveSiteContent } from '../../../services/siteContentService';
import {
  findFitProblem,
  MEASUREMENT_BASIS_LABELS,
  MEASUREMENT_BASIS_TOKEN,
  sanitizeNotes,
  STANDARD_MEASURES,
  trimmedFit,
  visibleFitReference,
} from '../../../utils/sizeGuideInfo';
import { extractErrorMessage } from '../../../utils/errorMessage';
import { SIZE_GUIDE_INFO_LIMITS, type SizeGuideContent, type StandardMeasure } from '../../../types/sizeGuideContent';
import '../../../components/common/SizeGuide/SizeGuide.css';
import '../../components/SizeGuideEditor/SizeGuideEditor.css';
import './SizeGuideContentEditor.css';

const SAVED_FEEDBACK_MS = 4000;
const ALL_MEASURES = STANDARD_MEASURES.map(({ key }) => key);

const findContentProblem = (draft: SizeGuideContent): string | null => {
  const emptyMeasure = STANDARD_MEASURES.find(({ key }) => !draft.howToMeasure[key].trim());
  if (emptyMeasure) return `Completá la instrucción de ${emptyMeasure.label.toLowerCase()}.`;
  if (draft.notes.some((note) => !note.trim())) return 'Hay una aclaración vacía: completala o quitala.';
  return findFitProblem(draft.fitReference);
};

const toPublished = (draft: SizeGuideContent): SizeGuideContent => {
  const fitReference = draft.fitReference ? trimmedFit(draft.fitReference) : undefined;
  return {
    howToMeasure: Object.fromEntries(STANDARD_MEASURES.map(({ key }) => [key, draft.howToMeasure[key].trim()])) as SizeGuideContent['howToMeasure'],
    notes: sanitizeNotes(draft.notes),
    ...(fitReference ? { fitReference } : {}),
  };
};

/** En la vista previa el token se ve con un ejemplo: en cada producto depende de su tabla. */
const previewNotes = (notes: string[]): string[] =>
  sanitizeNotes(notes).map((note) => note.split(MEASUREMENT_BASIS_TOKEN).join(MEASUREMENT_BASIS_LABELS.body));

/** Se monta con el contenido ya cargado: el borrador arranca de lo publicado. */
const ContentForm = ({ initial }: { initial: SizeGuideContent }) => {
  const [draft, setDraft] = useState<SizeGuideContent>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Un error de validación queda viejo apenas el admin corrige algo.
  const patch = (next: Partial<SizeGuideContent>) => {
    setError(null);
    setDraft((prev) => ({ ...prev, ...next }));
  };
  const setHowTo = (measure: StandardMeasure, text: string) =>
    patch({ howToMeasure: { ...draft.howToMeasure, [measure]: text } });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const problem = findContentProblem(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    const next = toPublished(draft);
    try {
      await saveSiteContent(SIZE_GUIDE_CONTENT_KEY, { ...next, updatedAt: new Date().toISOString() });
      setDraft(next);
      setSaved(true);
      setTimeout(() => setSaved(false), SAVED_FEEDBACK_MS);
    } catch (err) {
      setError(extractErrorMessage(err, 'No pudimos guardar la guía. Intentá de nuevo.'));
    } finally {
      setSaving(false);
    }
  };

  const fitPreview = visibleFitReference(draft.fitReference);

  return (
    <div className="guide-content-layout">
      <form className="guide-content-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="admin-card guide-content-form__group" disabled={saving}>
          <legend className="guide-content-form__legend">1. ¿Cómo tomar tus medidas?</legend>
          <p className="size-guide-info__hint">Se muestra con la ilustración en todos los productos de indumentaria.</p>
          {STANDARD_MEASURES.map(({ key, label }, index) => (
            <div className="size-guide-info__field" key={key}>
              <label htmlFor={`guide-howto-${key}`}>{label}</label>
              <textarea
                id={`guide-howto-${key}`}
                className="size-guide-info__textarea"
                rows={3}
                autoFocus={index === 0}
                maxLength={SIZE_GUIDE_INFO_LIMITS.maxHowToLength}
                value={draft.howToMeasure[key]}
                aria-invalid={!draft.howToMeasure[key].trim()}
                onChange={(e) => setHowTo(key, e.target.value)}
              />
            </div>
          ))}
        </fieldset>

        <fieldset className="admin-card guide-content-form__group" disabled={saving}>
          <legend className="guide-content-form__legend">2. Aclaraciones importantes</legend>
          <p className="size-guide-info__hint">
            Las usan todos los productos, salvo los que tengan aclaraciones propias. Escribí {MEASUREMENT_BASIS_TOKEN} donde va
            "medidas corporales" o "de la prenda": se completa según cada producto. No afirmes cosas que no valgan para todos.
          </p>
          <NotesListEditor notes={draft.notes} onChange={(notes) => patch({ notes })} idPrefix="global-guide" disabled={saving} />
        </fieldset>

        <fieldset className="admin-card guide-content-form__group" disabled={saving}>
          <legend className="guide-content-form__legend">3. Modelo de referencia</legend>
          <p className="size-guide-info__hint">
            Se muestra en los productos de indumentaria (no en calzado). Cada producto puede usar una propia u ocultarla.
            Usá una foto y datos reales de tu modelo; subí la foto antes en "Imágenes". Lo que dejes vacío no se muestra.
          </p>
          <FitReferenceEditor
            idPrefix="global-fit"
            value={draft.fitReference ?? {}}
            onChange={(fitReference) => patch({ fitReference })}
            disabled={saving}
          />
        </fieldset>

        <div className="guide-content-form__actions">
          <button type="submit" className="admin-btn-primary admin-flex-center gap-2" disabled={saving}>
            {saving ? <LiaLoader size="xs" /> : <Save size={18} aria-hidden="true" />} {saving ? 'Guardando…' : 'Publicar'}
          </button>
          {saved && <span className="guide-content-form__ok" role="status">¡Publicado!</span>}
          {error && <span className="guide-content-form__error" role="alert">{error}</span>}
        </div>
      </form>

      <aside className="guide-content-preview" aria-label="Vista previa de la guía">
        <p className="guide-content-preview__title">Así lo ve el cliente</p>
        <div className="size-guide">
          <HowToMeasureSection measures={ALL_MEASURES} content={draft} />
          {previewNotes(draft.notes).length > 0 && <NotesSection notes={previewNotes(draft.notes)} />}
          {fitPreview
            ? <FitReferenceCard fit={fitPreview} />
            : <p className="size-guide-info__hint">La modelo de referencia aparece cuando cargues su altura o algún talle.</p>}
        </div>
      </aside>
    </div>
  );
};

const SizeGuideContentEditor = () => {
  const content = useSizeGuideContent();

  const renderBody = () => {
    if (content.status === 'loading' || content.status === 'idle') {
      return <LiaLoader size="lg" variant="section" label="Cargando..." />;
    }
    // Con error no se ofrece el formulario: publicar los textos por defecto pisaría los del admin.
    if (content.status === 'error') {
      return (
        <div className="admin-card guide-content-state" role="alert">
          <AlertTriangle size={32} aria-hidden="true" />
          <p>No pudimos cargar la guía de talles. {content.error}</p>
          <button type="button" className="admin-btn-secondary" onClick={content.reload}>
            <RefreshCw size={16} aria-hidden="true" /> Reintentar
          </button>
        </div>
      );
    }
    return <ContentForm initial={content.content} />;
  };

  return (
    <div className="admin-guide-content">
      <Link to="/admin/sizes" className="guide-content__back"><ArrowLeft size={16} aria-hidden="true" /> Volver a Talles</Link>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Guía de talles general</h1>
        <p className="admin-page-subtitle">
          Lo que se repite en todos los productos. La tabla de medidas se carga en cada producto (Variantes › Guía de talles).
        </p>
      </div>
      {renderBody()}
    </div>
  );
};

export default SizeGuideContentEditor;
