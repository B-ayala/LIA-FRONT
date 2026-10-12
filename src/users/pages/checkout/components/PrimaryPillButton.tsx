import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import './PrimaryPillButton.css';

type PillButtonVariant = 'primary' | 'secondary';

interface PrimaryPillButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children: ReactNode;
  variant?: PillButtonVariant;
  loading?: boolean;
  /** React 19: `ref` llega como prop (p. ej. para dar el foco inicial en un diálogo). */
  ref?: Ref<HTMLButtonElement>;
}

/** Botón pill del checkout. Con `loading` queda deshabilitado y lo anuncia con aria-busy. */
const PrimaryPillButton = ({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  ref,
  ...buttonProps
}: PrimaryPillButtonProps) => (
  <button
    ref={ref}
    type={type}
    className={`pill-button pill-button--${variant}`}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...buttonProps}
  >
    {loading && <span className="pill-button__spinner" aria-hidden="true" />}
    <span>{children}</span>
  </button>
);

export default PrimaryPillButton;
