import type { InputHTMLAttributes } from 'react';
import './PillInput.css';

interface PillInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

/** Input redondeado (pill) con label visible, hint y error asociados por aria-describedby. */
const PillInput = ({ id, label, hint, error, ...inputProps }: PillInputProps) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="pill-input">
      <label className="pill-input__label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`pill-input__field${error ? ' pill-input__field--error' : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {hint && <p id={hintId} className="pill-input__hint">{hint}</p>}
      {error && <p id={errorId} className="pill-input__error">{error}</p>}
    </div>
  );
};

export default PillInput;
