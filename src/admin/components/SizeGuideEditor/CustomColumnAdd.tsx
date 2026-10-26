import { useState } from 'react';

interface CustomColumnAddProps {
  placeholder: string;
  /** Devuelve true si el talle se agregó (limpia el campo). */
  onAdd: (rawName: string) => boolean;
}

const CustomColumnAdd = ({ placeholder, onAdd }: CustomColumnAddProps) => {
  const [value, setValue] = useState('');

  const submit = () => {
    if (onAdd(value)) setValue('');
  };

  return (
    <div className="size-guide-col-add">
      <label className="size-guide-visually-hidden" htmlFor="size-guide-custom-input">Nuevo talle propio</label>
      <input
        id="size-guide-custom-input"
        type="text"
        className="size-guide-col-add__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
      />
      <button type="button" className="size-guide-col-add__btn" onClick={submit}>+ Agregar</button>
    </div>
  );
};

export default CustomColumnAdd;
