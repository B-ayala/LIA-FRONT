import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, AlertCircle } from 'lucide-react';
import SEO from '../../../components/common/SEO/SEO';
import { useAuthStore } from '../../../store/authStore';
import { createWithdrawal, type WithdrawalReceipt } from '../../../services/withdrawalService';
import {
  DESCRIPTION_MAX_LENGTH,
  EMPTY_WITHDRAWAL_FORM,
  toWithdrawalPayload,
  validateWithdrawalField,
  validateWithdrawalForm,
  type WithdrawalErrors,
  type WithdrawalField,
  type WithdrawalFormValues,
} from './withdrawalValidation';
import './Withdrawal.css';

const COPIED_FEEDBACK_MS = 2000;
const NETWORK_ERROR_MESSAGE = 'No pudimos conectarnos. Revisá tu conexión y reintentá.';

interface FieldProps {
  id: WithdrawalField;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

const fieldId = (field: WithdrawalField): string => `withdrawal-${field}`;

const Field = ({ id, label, hint, error, children }: FieldProps) => (
  <div className="form-group withdrawal-field">
    <label htmlFor={fieldId(id)}>{label}</label>
    {children}
    {hint && !error && <span id={`${fieldId(id)}-hint`} className="withdrawal-hint">{hint}</span>}
    {error && <span id={`${fieldId(id)}-error`} className="withdrawal-error" role="alert">{error}</span>}
  </div>
);

const describedBy = (id: WithdrawalField, hasHint: boolean, error?: string): string | undefined => {
  if (error) return `${fieldId(id)}-error`;
  return hasHint ? `${fieldId(id)}-hint` : undefined;
};

const WithdrawalSuccess = ({ receipt }: { receipt: WithdrawalReceipt }) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(receipt.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Sin permiso de portapapeles el código sigue visible para copiarlo a mano.
      setCopied(false);
    }
  };

  return (
    <section className="withdrawal-card withdrawal-success" aria-live="polite">
      <CheckCircle2 size={44} className="withdrawal-success-icon" aria-hidden="true" />
      <h2 ref={headingRef} tabIndex={-1}>Recibimos tu solicitud</h2>
      <p>Este es tu código de seguimiento y tu constancia. No te enviamos un mail: copialo o sacale una captura ahora.</p>
      <p className="withdrawal-code" data-testid="withdrawal-code">{receipt.code}</p>
      <button type="button" className="withdrawal-secondary-btn" onClick={copyCode}>
        <Copy size={16} aria-hidden="true" /> {copied ? 'Código copiado' : 'Copiar código'}
      </button>
      <p className="withdrawal-note">
        Vamos a gestionar tu solicitud dentro de las 24 horas. Si necesitás consultarnos, citá este código.
      </p>
    </section>
  );
};

const Withdrawal = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [values, setValues] = useState<WithdrawalFormValues>(EMPTY_WITHDRAWAL_FORM);
  const [errors, setErrors] = useState<WithdrawalErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [receipt, setReceipt] = useState<WithdrawalReceipt | null>(null);
  const prefilled = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Si hay sesión se precargan nombre y email una sola vez; el usuario puede corregirlos.
  useEffect(() => {
    if (prefilled.current || !currentUser) return;
    prefilled.current = true;
    setValues((prev) => ({
      ...prev,
      name: prev.name || currentUser.name || '',
      email: prev.email || currentUser.email || '',
    }));
  }, [currentUser]);

  useEffect(() => {
    (values.name ? emailRef.current ?? nameRef.current : nameRef.current)?.focus();
    // Solo al montar: no debe robar el foco mientras el usuario escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field: WithdrawalField) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = { ...values, [field]: event.currentTarget.value };
      setValues(next);
      // Un error ya visible se actualiza al escribir; los nuevos aparecen al salir del campo.
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: validateWithdrawalField(field, next) ?? undefined }));
      }
    };

  const handleBlur = (field: WithdrawalField) => () => {
    const message = validateWithdrawalField(field, values);
    setErrors((prev) => ({ ...prev, [field]: message ?? undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const formErrors = validateWithdrawalForm(values);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      document.getElementById(fieldId(Object.keys(formErrors)[0] as WithdrawalField))?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      setReceipt(await createWithdrawal(toWithdrawalPayload(values)));
    } catch (error) {
      setSubmitError(error instanceof TypeError ? NETWORK_ERROR_MESSAGE : (error as Error).message || NETWORK_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="withdrawal-page">
      <SEO
        title="Botón de arrepentimiento"
        description="Pedí la revocación de tu compra a distancia dentro de los 10 días corridos de recibido el producto."
        path="/arrepentimiento"
      />
      <header className="withdrawal-header">
        <h1>Botón de arrepentimiento</h1>
        <p>
          Si compraste por internet, podés arrepentirte dentro de los 10 días corridos de recibir el producto,
          sin dar explicaciones y sin costo para vos. Completá este formulario: no necesitás tener cuenta.
        </p>
      </header>

      {receipt ? (
        <WithdrawalSuccess receipt={receipt} />
      ) : (
        <form className="withdrawal-card" onSubmit={handleSubmit} noValidate>
          {submitError && (
            <div className="withdrawal-alert" role="alert">
              <AlertCircle size={18} aria-hidden="true" /> {submitError}
            </div>
          )}

          <Field id="name" label="Nombre y apellido" error={errors.name}>
            <input
              id={fieldId('name')} ref={nameRef} type="text" autoComplete="name" value={values.name}
              onChange={handleChange('name')} onBlur={handleBlur('name')}
              aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('name', false, errors.name)}
              disabled={submitting} required
            />
          </Field>

          <Field id="email" label="Email con el que compraste" error={errors.email}>
            <input
              id={fieldId('email')} ref={emailRef} type="email" autoComplete="email" inputMode="email" value={values.email}
              onChange={handleChange('email')} onBlur={handleBlur('email')}
              aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email', false, errors.email)}
              disabled={submitting} required
            />
          </Field>

          <Field id="description" label="¿Qué compraste?" error={errors.description}
            hint="Por ejemplo: campera negra talle M, comprada el 6/10.">
            <textarea
              id={fieldId('description')} rows={3} value={values.description} maxLength={DESCRIPTION_MAX_LENGTH}
              onChange={handleChange('description')} onBlur={handleBlur('description')}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={describedBy('description', true, errors.description)}
              disabled={submitting} required
            />
          </Field>

          <Field id="orderNumber" label="N° de pedido (opcional)" error={errors.orderNumber}
            hint="Lo ves en Mis compras. Si no lo tenés a mano, dejalo vacío.">
            <input
              id={fieldId('orderNumber')} type="text" inputMode="numeric" autoComplete="off" value={values.orderNumber}
              onChange={handleChange('orderNumber')} onBlur={handleBlur('orderNumber')}
              aria-invalid={Boolean(errors.orderNumber)}
              aria-describedby={describedBy('orderNumber', true, errors.orderNumber)}
              disabled={submitting}
            />
          </Field>

          <button type="submit" className="withdrawal-primary-btn" disabled={submitting} aria-busy={submitting}>
            {submitting ? 'Enviando…' : 'Solicitar arrepentimiento'}
          </button>
        </form>
      )}
    </main>
  );
};

export default Withdrawal;
