import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, RefreshCw, Save } from 'lucide-react';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import NotesListEditor from '../../components/SizeGuideEditor/NotesListEditor';
import { useSizeGuideContent } from '../../../hooks/useSizeGuideContent';
import { SIZE_GUIDE_CONTENT_KEY } from '../../../services/sizeGuideContentService';
import { saveSiteContent } from '../../../services/siteContentService';
import { MEASUREMENT_BASIS_TOKEN, sanitizeNotes, STANDARD_MEASURES } from '../../../utils/sizeGuideInfo';
import { extractErrorMessage } from '../../../utils/errorMessage';
import { SIZE_GUIDE_INFO_LIMITS, type SizeGuideContent, type StandardMeasure } from '../../../types/sizeGuideContent';
import '../../components/SizeGuideEditor/SizeGuideEditor.css';
import './SizeGuideContentEditor.css';

const SAVED_FEEDBACK_MS = 4000;

const findContentProblem = (draft: SizeGuideContent): string | null => {
  const emptyMeasure = STANDARD_MEASURES.find(({ key }) => !draft.howToMeasure[key].trim());
  if (emptyMeasure) return `Completá la instrucción de ${emptyMeasure.label.toLowerCase()}.`;
  if (draft.notes.some((note) => !note.trim())) return 'Hay una aclaración vacía: completala o quitala.';
  return null;
};

/** Se monta con el contenido ya cargado: el borrador arranca de lo publicado. */
const ContentForm = ({ initial }: { initial: SizeGuideContent }) => {
  const [draft, setDraft] = useState<SizeGuideContent>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setHowTo = (measure: StandardMeasure, text: string) =>
    setDraft((prev) => ({ ...prev, howToMeasure: { ...prev.howToMeasure, [measure]: text } }));

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
    const next: SizeGuideContent = {
      howToMeasure: Object.fromEntries(STANDARD_MEASURES.map(({ key }) => [key, draft.howToMeasure[key].trim()])) as SizeGuideContent['howToMeasure'],
      notes: sanitizeNotes(draft.notes),
    };
    try {
      await saveSiteContent(SIZE_GUIDE_CONTENT_KEY, { ...next, updatedAt: new Date().toISOString() });
      setDraft(next);
      setSaved(true);
      setTimeout(() => setSaved(false), SAVED_FEEDBACK_MS);
    } catch (err) {
      setError(extractErrorMessage(err, 'No pudimos guardar los textos. Intentá de nuevo.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="guide-content-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="admin-card guide-content-form__group" disabled={saving}>
        <legend className="guide-content-form__legend">¿Cómo tomar tus medidas?</legend>
        {STANDARD_MEASURES.map(({ key, label }, index) => (
          <div className="size-guide-info__field" key={key}>
            <label htmlFor={`guide-howto-${key}`}>{label}</label>
            <textarea
              id={`guide-howto-${key}`}
              className="size-guide-info__textarea"
              rows={2}
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
        <legend className="guide-content-form__legend">Aclaraciones importantes (por defecto)</legend>
        <p className="size-guide-info__hint">
          Se muestran en todos los productos que no tengan aclaraciones propias. Escribí {MEASUREMENT_BASIS_TOKEN} donde va
          "medidas corporales" o "medidas de la prenda": esa aclaración solo aparece en las guías que lo indiquen.
          No afirmes características (tejido elastizado, medidas aproximadas…) que no valgan para todos los productos.
        </p>
        <NotesListEditor notes={draft.notes} onChange={(notes) => setDraft((prev) => ({ ...prev, notes }))} idPrefix="global-guide" disabled={saving} />
      </fieldset>

      <div className="guide-content-form__actions">
        <button type="submit" className="admin-btn-primary admin-flex-center gap-2" disabled={saving}>
          {saving ? <LiaLoader size="xs" /> : <Save size={18} aria-hidden="true" />} {saving ? 'Guardando…' : 'Publicar'}
        </button>
        {saved && <span className="guide-content-form__ok" role="status">¡Publicado!</span>}
        {error && <span className="guide-content-form__error" role="alert">{error}</span>}
      </div>
    </form>
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
          <p>No pudimos cargar los textos de la guía. {content.error}</p>
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
        <h1 className="admin-page-title">Textos de la guía de talles</h1>
        <p className="admin-page-subtitle">
          Instrucciones para medirse y aclaraciones que ven los clientes en "Ver guía de talles" de cada producto.
          Las medidas, la referencia de calce y las aclaraciones propias se cargan en cada producto.
        </p>
      </div>
      {renderBody()}
    </div>
  );
};

export default SizeGuideContentEditor;
