import { useId, type ReactNode } from 'react';
import { BANNER_PALETTE } from '../../../utils/carouselBanner';

interface FieldShellProps {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}

const FieldShell = ({ label, hint, children }: FieldShellProps) => {
  const id = useId();
  return (
    <div className="be-field">
      <label className="be-field__label" htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <p className="be-field__hint">{hint}</p>}
    </div>
  );
};

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
}

export const TextField = ({ label, value, onChange, hint, error, multiline, maxLength, placeholder }: TextFieldProps) => (
  <FieldShell label={label} hint={error ? undefined : hint}>
    {(id) => (
      <>
        {multiline ? (
          <textarea
            id={id}
            className="be-input"
            rows={3}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <input
            id={id}
            className="be-input"
            type="text"
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {error && <p className="be-field__error" role="alert">{error}</p>}
      </>
    )}
  </FieldShell>
);

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

export const SliderField = ({ label, value, min, max, step, unit = '', onChange }: SliderFieldProps) => (
  <FieldShell label={label}>
    {(id) => (
      <div className="be-slider">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <output htmlFor={id}>{Number.isInteger(value) ? value : value.toFixed(1)}{unit}</output>
      </div>
    )}
  </FieldShell>
);

interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  ariaLabel?: string;
}

interface SegmentedFieldProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
}

export function SegmentedField<T extends string | number>({ label, value, options, onChange }: SegmentedFieldProps<T>) {
  const labelId = useId();
  return (
    <div className="be-field">
      <span className="be-field__label" id={labelId}>{label}</span>
      <div className="be-segmented" role="radiogroup" aria-labelledby={labelId}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            aria-label={option.ariaLabel}
            className={`be-segmented__btn${option.value === value ? ' is-active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export const ColorField = ({ label, value, onChange }: ColorFieldProps) => {
  const labelId = useId();
  const customId = useId();
  return (
    <div className="be-field">
      <span className="be-field__label" id={labelId}>{label}</span>
      <div className="be-swatches" role="group" aria-labelledby={labelId}>
        {BANNER_PALETTE.map((color) => (
          <button
            key={color.value}
            type="button"
            className={`be-swatch${color.value === value ? ' is-active' : ''}`}
            style={{ background: color.value }}
            aria-label={color.label}
            aria-pressed={color.value === value}
            title={color.label}
            onClick={() => onChange(color.value)}
          />
        ))}
        <label className="be-swatch be-swatch--custom" htmlFor={customId} title="Elegir otro color">
          <span className="be-visually-hidden">Color personalizado</span>
          <input id={customId} type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
      </div>
    </div>
  );
};

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const ToggleField = ({ label, checked, onChange }: ToggleFieldProps) => (
  <label className="be-toggle">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span>{label}</span>
  </label>
);
