interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface ChoiceGroupProps<T extends string> {
  /** Nombre del grupo de radios (único en pantalla). */
  name: string;
  legend: string;
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Opciones excluyentes como botones segmentados (radios nativos: teclado y lector de pantalla incluidos). */
const ChoiceGroup = <T extends string>({ name, legend, options, value, onChange }: ChoiceGroupProps<T>) => (
  <fieldset className="choice-group">
    <legend className="choice-group__legend">{legend}</legend>
    <div className="choice-group__options">
      {options.map((option) => (
        <label key={option.value} className={`choice-group__option${option.value === value ? ' choice-group__option--on' : ''}`}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  </fieldset>
);

export default ChoiceGroup;
