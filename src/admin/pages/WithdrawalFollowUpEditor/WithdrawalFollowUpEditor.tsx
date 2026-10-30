import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { TextField } from '@mui/material';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import { saveSiteContent } from '../../../services/siteContentService';
import {
  FOLLOWUP_MAX_LENGTH,
  FOLLOWUP_MAX_STEPS,
  WITHDRAWAL_FOLLOWUP_KEY,
  getWithdrawalFollowUp,
  type WithdrawalFollowUp,
} from '../../../services/withdrawalFollowUpService';
import { extractErrorMessage } from '../../../utils/errorMessage';
import '../../components/LegalContentEditor/LegalContentEditor.css';

const SAVED_FEEDBACK_MS = 4000;

const splitSteps = (text: string): string[] => text.split('\n').map((line) => line.trim()).filter(Boolean);

const WithdrawalFollowUpEditor = () => {
  const [steps, setSteps] = useState('');
  const [refundTerm, setRefundTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWithdrawalFollowUp()
      .then((current) => {
        if (cancelled) return;
        setSteps(current.nextSteps);
        setRefundTerm(current.refundTerm);
      })
      .catch((err) => { if (!cancelled) setError(extractErrorMessage(err, 'No pudimos cargar el texto.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const lines = splitSteps(steps);
  const tooMany = lines.length > FOLLOWUP_MAX_STEPS;
  const tooLong = lines.some((line) => line.length > FOLLOWUP_MAX_LENGTH) || refundTerm.length > FOLLOWUP_MAX_LENGTH;
  const invalid = lines.length === 0 || tooMany || tooLong;

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (invalid || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const value: WithdrawalFollowUp = { nextSteps: lines.join('\n'), refundTerm: refundTerm.trim() };
    try {
      await saveSiteContent(WITHDRAWAL_FOLLOWUP_KEY, { ...value, updatedAt: new Date().toISOString() });
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
      <Link to="/admin/arrepentimientos" className="legal-editor__back"><ArrowLeft size={16} /> Volver a Arrepentimientos</Link>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Mail de constancia</h1>
        <p className="admin-page-subtitle">
          Editá el “Qué sigue” del mail que recibe el cliente al pedir un arrepentimiento. El código de seguimiento,
          la fecha y hora de recepción y el pedido se agregan solos.
        </p>
      </div>

      <div className="admin-card">
        <form onSubmit={handleSave} className="legal-editor__form" noValidate>
          <TextField
            label="Qué sigue (un paso por línea)"
            value={steps}
            onChange={(event) => setSteps(event.target.value)}
            multiline
            minRows={5}
            fullWidth
            required
            error={invalid}
            helperText={
              lines.length === 0 ? 'Escribí al menos un paso.'
                : tooMany ? `Máximo ${FOLLOWUP_MAX_STEPS} pasos.`
                  : tooLong ? `Cada paso admite hasta ${FOLLOWUP_MAX_LENGTH} caracteres.`
                    : 'Cada línea sale como un punto de la lista.'
            }
          />
          <TextField
            label="Plazo del reintegro (opcional)"
            value={refundTerm}
            onChange={(event) => setRefundTerm(event.target.value)}
            helperText="Se agrega como “Plazo del reintegro: …”. Si lo dejás vacío, el mail no promete ningún plazo."
            slotProps={{ htmlInput: { maxLength: FOLLOWUP_MAX_LENGTH } }}
            fullWidth
          />
          <div className="legal-editor__actions">
            <button type="submit" className="admin-btn-primary save-btn admin-flex-center gap-2" disabled={invalid || saving}>
              {saving ? <LiaLoader size="xs" /> : <Save size={18} />} {saving ? 'Guardando…' : 'Publicar'}
            </button>
            {saved && <span className="save-success text-green-600 font-medium" role="status">¡Publicado!</span>}
            {error && <span className="text-red-500 font-medium" role="alert">{error}</span>}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="legal-editor__preview-title">Vista previa del mail</h2>
        <div className="legal-editor__preview legal-card">
          <p>Hola [nombre], recibimos tu solicitud de arrepentimiento el [fecha y hora].</p>
          <p>Tu código de seguimiento es: [código]</p>
          <p><strong>Qué sigue:</strong></p>
          <ul>
            {lines.slice(0, FOLLOWUP_MAX_STEPS).map((line, index) => <li key={index}>{line}</li>)}
            {refundTerm.trim() && <li>Plazo del reintegro: {refundTerm.trim()}.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalFollowUpEditor;
