import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Checkbox, FormControlLabel, FormHelperText, TextField } from '@mui/material';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import LegalMarkup from '../../../users/pages/legal/LegalMarkup';
import { PENDING_MARKER } from '../../../users/pages/legal/defaultReturns';
import { saveSiteContent } from '../../../services/siteContentService';
import { extractErrorMessage } from '../../../utils/errorMessage';
import { nextTermsVersion } from './nextTermsVersion';
import '../../../users/pages/legal/LegalPage.css';
import './LegalContentEditor.css';

const MAX_BODY_LENGTH = 50_000;
const SAVED_FEEDBACK_MS = 4000;

const FORMAT_HELP = [
  '## Título   → título de una sección',
  '### Pregunta   → subtítulo o pregunta',
  '- ítem   → lista (una línea por ítem)',
  '[texto](/privacidad)   → enlace a otra página del sitio',
  '[texto](https://…)   → enlace externo',
  'Dejá una línea en blanco entre párrafos.',
];

export interface PublishedLegalText {
  body: string;
  /** Solo en los textos que los clientes deben aceptar (Términos). */
  version?: string;
}

interface LegalContentEditorProps {
  title: string;
  subtitle: ReactNode;
  /** Clave de `site_content` donde se publica el texto. */
  contentKey: string;
  /** Texto vigente: el publicado por el admin o, si no hay, el de por defecto. */
  load: () => Promise<PublishedLegalText>;
  /** true = el texto tiene versión y un cambio importante obliga a volver a aceptarlo. */
  versioned: boolean;
  backTo?: { to: string; label: string };
}

const countPending = (text: string): number => text.split(PENDING_MARKER).length - 1;

const LegalContentEditor = ({ title, subtitle, contentKey, load, versioned, backTo }: LegalContentEditorProps) => {
  const [published, setPublished] = useState<PublishedLegalText>({ body: '' });
  const [body, setBody] = useState('');
  const [requireReacceptance, setRequireReacceptance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((content) => {
        if (cancelled) return;
        setPublished(content);
        setBody(content.body);
      })
      .catch((err) => { if (!cancelled) setError(extractErrorMessage(err, 'No pudimos cargar el texto.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [load]);

  const trimmedBody = body.trim();
  const unchanged = trimmedBody === published.body.trim();
  const tooLong = body.length > MAX_BODY_LENGTH;
  const pending = countPending(body);
  const publishedVersion = published.version ?? '';
  const nextVersion = versioned && requireReacceptance ? nextTermsVersion(publishedVersion) : publishedVersion;
  const publishDisabled = saving || !trimmedBody || tooLong || pending > 0 || (unchanged && !(versioned && requireReacceptance));

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (publishDisabled) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const next: PublishedLegalText = versioned ? { version: nextVersion, body: trimmedBody } : { body: trimmedBody };
    try {
      await saveSiteContent(contentKey, { ...next, updatedAt: new Date().toISOString() });
      setPublished(next);
      setBody(next.body);
      setRequireReacceptance(false);
      setSaved(true);
      setTimeout(() => setSaved(false), SAVED_FEEDBACK_MS);
    } catch (err) {
      setError(extractErrorMessage(err, 'No pudimos guardar el texto. Intentá de nuevo.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="admin-legal-editor"><LiaLoader size="lg" variant="section" label="Cargando..." /></div>;
  }

  return (
    <div className="admin-legal-editor">
      {backTo && (
        <Link to={backTo.to} className="legal-editor__back"><ArrowLeft size={16} /> {backTo.label}</Link>
      )}
      <div className="admin-page-header">
        <h1 className="admin-page-title">{title}</h1>
        <p className="admin-page-subtitle">
          {subtitle}
          {versioned && publishedVersion && <> Versión vigente: <strong>{publishedVersion}</strong>.</>}
        </p>
      </div>

      {pending > 0 && (
        <div className="admin-card legal-editor__pending" role="status">
          <strong>Quedan {pending} punto{pending === 1 ? '' : 's'} [A DEFINIR] sin completar.</strong>{' '}
          Reemplazá cada <code>[A DEFINIR: …]</code> por lo que decida el negocio. No se puede publicar hasta completarlos.
        </div>
      )}

      <div className="admin-card">
        <form onSubmit={handleSave} className="legal-editor__form" noValidate>
          <TextField
            label="Texto"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            multiline
            minRows={14}
            fullWidth
            required
            error={tooLong || !trimmedBody}
            helperText={tooLong ? `Máximo ${MAX_BODY_LENGTH} caracteres.` : !trimmedBody ? 'El texto no puede quedar vacío.' : undefined}
            slotProps={{ htmlInput: { 'aria-describedby': 'legal-format-help' } }}
          />

          <details className="legal-editor__help" id="legal-format-help">
            <summary>Cómo dar formato</summary>
            <ul>{FORMAT_HELP.map((line) => <li key={line}>{line}</li>)}</ul>
          </details>

          {versioned && (
            <div>
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={requireReacceptance}
                    onChange={(event) => setRequireReacceptance(event.target.checked)}
                  />
                )}
                label="Es un cambio importante: pedir a todos los clientes que vuelvan a aceptar"
              />
              <FormHelperText sx={{ mx: 0 }}>
                {requireReacceptance
                  ? `Se publica la versión ${nextVersion}. En su próxima compra, cada cliente tendrá que aceptarla.`
                  : 'Sin tildar, es una corrección menor: se mantiene la versión y nadie tiene que volver a aceptar.'}
              </FormHelperText>
            </div>
          )}

          <div className="legal-editor__actions">
            <button type="submit" className="admin-btn-primary save-btn admin-flex-center gap-2" disabled={publishDisabled}>
              {saving ? <LiaLoader size="xs" /> : <Save size={18} />} {saving ? 'Guardando…' : 'Publicar'}
            </button>
            {saved && <span className="save-success text-green-600 font-medium" role="status">¡Publicado!</span>}
            {error && <span className="text-red-500 font-medium" role="alert">{error}</span>}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="legal-editor__preview-title">Vista previa</h2>
        <div className="legal-editor__preview legal-card">
          <LegalMarkup source={trimmedBody || ' '} />
        </div>
      </div>
    </div>
  );
};

export default LegalContentEditor;
