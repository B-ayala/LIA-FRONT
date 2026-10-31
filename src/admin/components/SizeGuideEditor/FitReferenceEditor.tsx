import { useState } from 'react';
import { ImageIcon, Trash2 } from 'lucide-react';
import type { SizeGuideFitReference } from '../../../types/product';
import { SIZE_GUIDE_INFO_LIMITS } from '../../../types/sizeGuideContent';
import { buildCloudinaryUrl } from '../../../utils/cloudinary';
import CloudinaryImagePicker from '../CloudinaryImagePicker/CloudinaryImagePicker';

interface FitReferenceEditorProps {
  value: SizeGuideFitReference;
  onChange: (value: SizeGuideFitReference) => void;
  /** Prefijo único para los ids cuando hay más de un editor en pantalla. */
  idPrefix: string;
  /** Fotos del producto como atajo para elegir la de la modelo (en la modelo general no hay). */
  productImages?: string[];
  disabled?: boolean;
}

type FitTextKey = 'topSize' | 'bottomSize' | 'fittedSize';

const SIZE_FIELDS: { key: FitTextKey; label: string; placeholder: string }[] = [
  { key: 'topSize', label: 'Partes de arriba', placeholder: 'Ej: S' },
  { key: 'bottomSize', label: 'Pantalones', placeholder: 'Ej: S' },
  { key: 'fittedSize', label: 'Calzas, shorts y ajustadas', placeholder: 'Ej: M' },
];

const FIT_SUGGESTIONS = ['Ajustado', 'Regular', 'Holgado'];
const THUMB = { width: 240, height: 300, crop: 'fill', gravity: 'auto' } as const;

const parseHeight = (raw: string): number | undefined => {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
};

/** Datos de la modelo de referencia. Todo lo que quede vacío no se publica. */
const FitReferenceEditor = ({ value, onChange, idPrefix, productImages = [], disabled = false }: FitReferenceEditorProps) => {
  const set = (patch: Partial<SizeGuideFitReference>) => onChange({ ...value, ...patch });
  const { minModelHeightCm, maxModelHeightCm } = SIZE_GUIDE_INFO_LIMITS;
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <div className="fit-ref-editor">
      <FitPhotoField
        image={value.image}
        productImages={productImages}
        disabled={disabled}
        onChange={(image) => set({ image })}
      />
      <div className="fit-ref-editor__fields">
        <div className="size-guide-info__field">
          <label htmlFor={id('height')}>Altura de la modelo (cm)</label>
          <input
            id={id('height')}
            type="number"
            inputMode="numeric"
            min={minModelHeightCm}
            max={maxModelHeightCm}
            step={1}
            placeholder="Ej: 170"
            disabled={disabled}
            value={value.modelHeightCm ?? ''}
            onChange={(e) => set({ modelHeightCm: parseHeight(e.target.value) })}
          />
        </div>
        <fieldset className="fit-ref-editor__sizes" disabled={disabled}>
          <legend>Talle que usa en…</legend>
          {SIZE_FIELDS.map(({ key, label, placeholder }) => (
            <div className="size-guide-info__field" key={key}>
              <label htmlFor={id(key)}>{label}</label>
              <input
                id={id(key)}
                type="text"
                maxLength={SIZE_GUIDE_INFO_LIMITS.maxFitSizeLength}
                placeholder={placeholder}
                value={value[key] ?? ''}
                onChange={(e) => set({ [key]: e.target.value })}
              />
            </div>
          ))}
        </fieldset>
        <div className="size-guide-info__field">
          <label htmlFor={id('fit')}>Calce (opcional)</label>
          <input
            id={id('fit')}
            type="text"
            list={id('fit-options')}
            maxLength={SIZE_GUIDE_INFO_LIMITS.maxFitTextLength}
            placeholder="Ej: Regular"
            disabled={disabled}
            value={value.fit ?? ''}
            onChange={(e) => set({ fit: e.target.value })}
          />
          <datalist id={id('fit-options')}>
            {FIT_SUGGESTIONS.map((option) => <option key={option} value={option} />)}
          </datalist>
        </div>
        <div className="size-guide-info__field">
          <label htmlFor={id('notes')}>Comentario (opcional)</label>
          <textarea
            id={id('notes')}
            className="size-guide-info__textarea"
            rows={2}
            maxLength={SIZE_GUIDE_INFO_LIMITS.maxFitNotesLength}
            placeholder="Ej: En prendas inferiores ajustadas usa un talle más."
            disabled={disabled}
            value={value.notes ?? ''}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};

interface FitPhotoFieldProps {
  image?: string;
  productImages: string[];
  disabled: boolean;
  onChange: (image: string | undefined) => void;
}

const FitPhotoField = ({ image, productImages, disabled, onChange }: FitPhotoFieldProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="fit-ref-photo">
      <p className="fit-ref-photo__label">Foto de la modelo</p>
      <div className="fit-ref-photo__frame">
        {image
          ? <img src={buildCloudinaryUrl(image, THUMB)} alt="Foto elegida de la modelo" />
          : <span className="fit-ref-photo__empty"><ImageIcon size={28} aria-hidden="true" />Sin foto</span>}
      </div>
      <div className="fit-ref-photo__actions">
        <button type="button" className="admin-btn-secondary" disabled={disabled} onClick={() => setPickerOpen(true)}>
          {image ? 'Cambiar foto' : 'Elegir foto'}
        </button>
        {image && (
          <button type="button" className="fit-ref-photo__remove" disabled={disabled} onClick={() => onChange(undefined)}>
            <Trash2 size={14} aria-hidden="true" /> Quitar
          </button>
        )}
      </div>
      {productImages.length > 0 && (
        <div className="fit-ref-photo__quick">
          <p className="size-guide-info__hint">O usá una foto de este producto:</p>
          <div className="fit-ref-photo__thumbs">
            {productImages.map((url, index) => (
              <button
                type="button"
                key={url}
                className={`fit-ref-photo__thumb${image === url ? ' fit-ref-photo__thumb--on' : ''}`}
                aria-pressed={image === url}
                aria-label={`Usar la foto ${index + 1} del producto`}
                disabled={disabled}
                onClick={() => onChange(url)}
              >
                <img src={buildCloudinaryUrl(url, { width: 120, height: 120 })} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
      <CloudinaryImagePicker
        open={pickerOpen}
        single
        onClose={() => setPickerOpen(false)}
        onSelect={(urls) => {
          if (urls[0]) onChange(urls[0]);
        }}
      />
    </div>
  );
};

export default FitReferenceEditor;
