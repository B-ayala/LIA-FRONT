import type { ReactNode } from 'react';
import './OptionList.css';

export interface OptionItem<T extends string> {
  value: T;
  title: string;
  aside?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  disabledReason?: string;
}

interface OptionListProps<T extends string> {
  name: string;
  labelledBy: string;
  options: OptionItem<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Radiogroup en card redondeada con separadores. Usa radios nativos (teclado y lectores de pantalla gratis). */
const OptionList = <T extends string>({ name, labelledBy, options, value, onChange }: OptionListProps<T>) => (
  <div className="option-list" role="radiogroup" aria-labelledby={labelledBy}>
    {options.map((option) => {
      const id = `${name}-${option.value}`;
      const reasonId = option.disabledReason ? `${id}-reason` : undefined;
      const selected = option.value === value;
      return (
        <label
          key={option.value}
          htmlFor={id}
          className={`option-list__item${selected ? ' option-list__item--selected' : ''}${option.disabled ? ' option-list__item--disabled' : ''}`}
        >
          <input
            id={id}
            type="radio"
            name={name}
            value={option.value}
            checked={selected}
            disabled={option.disabled}
            aria-describedby={reasonId}
            onChange={() => onChange(option.value)}
            className="option-list__radio"
          />
          <span className="option-list__body">
            <span className="option-list__head">
              <span className="option-list__title">{option.title}</span>
              {option.aside && <span className="option-list__aside">{option.aside}</span>}
            </span>
            {option.description && <span className="option-list__description">{option.description}</span>}
            {option.disabledReason && (
              <span id={reasonId} className="option-list__reason">{option.disabledReason}</span>
            )}
          </span>
        </label>
      );
    })}
  </div>
);

export default OptionList;
