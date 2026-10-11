import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './PrimaryPillButton.css';

type PillButtonVariant = 'primary' | 'secondary';

interface PrimaryPillButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children: ReactNode;
  variant?: PillButtonVariant;
  loading?: boolean;
}

/** Botón pill del checkout. Con `loading` queda deshabilitado y lo anuncia con aria-busy. */
const PrimaryPillButton = ({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  ...buttonProps
}: PrimaryPillButtonProps) => (
  <button
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
