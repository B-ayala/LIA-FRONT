import type { SizeGuideFitReference } from '../../../types/product';
import { SIZE_GUIDE_INFO_LIMITS } from '../../../types/sizeGuideContent';

interface FitReferenceEditorProps {
  value: SizeGuideFitReference;
  onChange: (value: SizeGuideFitReference) => void;
  /** Imágenes cargadas en el producto: la foto de la referencia solo puede ser una de ellas. */
  productImages: string[];
}

type FitTextKey = 'topSize' | 'bottomSize' | 'fittedSize';

const SIZE_FIELDS: { key: FitTextKey; label: string; placeholder: string }[] = [
  { key: 'topSize', label: 'Talle que usa en partes de arriba', placeholder: 'Ej: S' },
  { key: 'bottomSize', label: 'Talle que usa en pantalones / prendas inferiores', placeholder: 'Ej: S' },
  { key: 'fittedSize', label: 'Talle que usa en calzas, shorts, bermudas o prendas ajustadas', placeholder: 'Ej: M' },
];

const FIT_SUGGESTIONS = ['Ajustado', 'Regular', 'Holgado'];
const ID = 'fit-ref';

const parseHeight = (raw: string): number | undefined => {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
};

/** Datos opcionales de la modelo. Todo lo que quede vacío no se publica. */
const FitReferenceEditor = ({ value, onChange, productImages }: FitReferenceEditorProps) => {
  const set = (patch: Partial<SizeGuideFitReference>) => onChange({ ...value, ...patch });
  const { minModelHeightCm, maxModelHeightCm } = SIZE_GUIDE_INFO_LIMITS;

  return (
    <div className="fit-ref-editor">
      <p className="size-guide-info__hint">
        Completá solo con datos reales de la modelo que aparece con esta prenda. Lo que dejes vacío no se muestra en la tienda.
      </p>
      <div className="fit-ref-editor__grid">
        <div className="size-guide-info__field">
          <label htmlFor={`${ID}-height`}>Altura de la modelo (cm)</label>
          <input
            id={`${ID}-height`}
            type="number"
            inputMode="numeric"
            min={minModelHeightCm}
            max={maxModelHeightCm}
            step={1}
            placeholder="Ej: 170"
            value={value.modelHeightCm ?? ''}
            onChange={(e) => set({ modelHeightCm: parseHeight(e.target.value) })}
          />
        </div>
        {SIZE_FIELDS.map(({ key, label, placeholder }) => (
          <div className="size-guide-info__field" key={key}>
            <label htmlFor={`${ID}-${key}`}>{label}</label>
            <input
              id={`${ID}-${key}`}
              type="text"
              maxLength={SIZE_GUIDE_INFO_LIMITS.maxFitSizeLength}
              placeholder={placeholder}
              value={value[key] ?? ''}
              onChange={(e) => set({ [key]: e.target.value })}
            />
          </div>
        ))}
        <div className="size-guide-info__field">
          <label htmlFor={`${ID}-fit`}>Calce de la prenda</label>
          <input
            id={`${ID}-fit`}
            type="text"
            list={`${ID}-fit-options`}
            maxLength={SIZE_GUIDE_INFO_LIMITS.maxFitTextLength}
            placeholder="Ej: Ajustado, regular, holgado"
            value={value.fit ?? ''}
            onChange={(e) => set({ fit: e.target.value })}
          />
          <datalist id={`${ID}-fit-options`}>
            {FIT_SUGGESTIONS.map((option) => <option key={option} value={option} />)}
          </datalist>
        </div>
      </div>
      <div className="size-guide-info__field">
        <label htmlFor={`${ID}-notes`}>Información adicional (opcional)</label>
        <textarea
          id={`${ID}-notes`}
          className="size-guide-info__textarea"
          rows={2}
          maxLength={SIZE_GUIDE_INFO_LIMITS.maxFitNotesLength}
          placeholder="Ej: Por su contextura, en prendas inferiores ajustadas usa un talle más."
          value={value.notes ?? ''}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
      <FitPhotoPicker selected={value.image} images={productImages} onSelect={(image) => set({ image })} />
    </div>
  );
};

interface FitPhotoPickerProps {
  selected?: string;
  images: string[];
  onSelect: (image: string | undefined) => void;
}

const FitPhotoPicker = ({ selected, images, onSelect }: FitPhotoPickerProps) => (
  <fieldset className="fit-ref-photos">
    <legend>Foto de la modelo (una de las imágenes del producto)</legend>
    {images.length === 0 ? (
      <p className="size-guide-info__hint">Cargá imágenes en "Datos Básicos" para poder elegir una.</p>
    ) : (
      <div className="fit-ref-photos__list">
        <button
          type="button"
          className={`fit-ref-photos__none${selected ? '' : ' fit-ref-photos__item--on'}`}
          aria-pressed={!selected}
          onClick={() => onSelect(undefined)}
        >
          Sin foto
        </button>
        {images.map((url, index) => (
          <button
            type="button"
            key={url}
            className={`fit-ref-photos__item${selected === url ? ' fit-ref-photos__item--on' : ''}`}
            aria-pressed={selected === url}
            aria-label={`Usar imagen ${index + 1} del producto`}
            onClick={() => onSelect(url)}
          >
            <img src={url} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    )}
  </fieldset>
);

export default FitReferenceEditor;
