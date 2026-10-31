import { useState, type FormEvent } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import { createSize, updateSize } from '../../../services/sizeService';
import { SIZE_LIMITS, type Size, type SizeType } from '../../../types/size';
import { extractErrorMessage } from '../../../utils/errorMessage';
import {
    findDuplicateMeasurementError,
    measurementsToRows,
    rowsToMeasurements,
    toSizeKey,
    type MeasurementRow,
} from '../../../utils/sizeMeasurements';
import { normalizeGarment } from '../../../utils/sizeGarment';
import { STANDARD_MEASURES } from '../../../utils/sizeGuideInfo';
import MeasurementsEditor from './MeasurementsEditor';
import './SizeFormModal.css';

interface SizeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** null = crear un talle nuevo. */
    size: Size | null;
    onSaved: (saved: Size) => void;
    /** Prendas ya usadas en el catálogo, para reutilizar la escritura. */
    garmentSuggestions: string[];
}

const TYPE_OPTIONS: { value: SizeType; label: string }[] = [
    { value: 'indumentaria', label: 'Indumentaria' },
    { value: 'calzado', label: 'Calzado' },
];

interface SizeFormBodyProps {
    size: Size | null;
    onClose: () => void;
    onSaved: (saved: Size) => void;
    garmentSuggestions: string[];
}

/** Talle nuevo de indumentaria: precarga los nombres de las medidas estándar, sin valores (los carga el admin). */
const initialRows = (type: SizeType): MeasurementRow[] =>
    type === 'indumentaria' ? STANDARD_MEASURES.map(({ label }) => ({ key: label, value: '' })) : [];

const isUntouchedInitialRows = (rows: MeasurementRow[], type: SizeType): boolean => {
    const initial = initialRows(type);
    return rows.length === initial.length && rows.every((row, i) => row.key === initial[i].key && !row.value.trim());
};

// Se monta al abrir el modal (MUI desmonta el contenido al cerrar), así el estado arranca limpio.
const SizeFormBody = ({ size, onClose, onSaved, garmentSuggestions }: SizeFormBodyProps) => {
    const [name, setName] = useState(size?.name ?? '');
    const [garment, setGarment] = useState(size?.garment ?? '');
    const [type, setType] = useState<SizeType>(size?.type ?? 'indumentaria');
    const [rows, setRows] = useState<MeasurementRow[]>(() => (size ? measurementsToRows(size.measurements) : initialRows('indumentaria')));
    const [nameError, setNameError] = useState('');
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    const changeType = (next: SizeType) => {
        if (!size && isUntouchedInitialRows(rows, type)) setRows(initialRows(next));
        setType(next);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (saving) return;

        const normalizedName = toSizeKey(name);
        if (!normalizedName) {
            setNameError('Escribí el nombre del talle.');
            return;
        }
        const measurementsError = findDuplicateMeasurementError(rows);
        if (measurementsError) {
            setFormError(measurementsError);
            return;
        }

        setSaving(true);
        setNameError('');
        setFormError('');
        try {
            // Las medidas precargadas que quedaron sin valor no se guardan: serían celdas vacías en cada producto.
            const filledRows = size ? rows : rows.filter((row) => row.value.trim() || !initialRows(type).some((initial) => initial.key === row.key));
            const payload = { name: normalizedName, type, garment: normalizeGarment(garment), measurements: rowsToMeasurements(filledRows) };
            const saved = size ? await updateSize(size.id, payload) : await createSize(payload);
            onSaved(saved);
        } catch (err) {
            setFormError(extractErrorMessage(err, 'No pudimos guardar el talle. Reintentá.'));
            setSaving(false);
        }
    };

    return (
        <form className="size-form" onSubmit={handleSubmit} noValidate>
            <div className="size-form__field">
                <label htmlFor="size-form-type">Tipo</label>
                <select id="size-form-type" autoFocus value={type} onChange={(e) => changeType(e.target.value as SizeType)}>
                    {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </div>

            <div className="size-form__field">
                <label htmlFor="size-form-garment">Prenda (opcional)</label>
                <input
                    id="size-form-garment"
                    type="text"
                    list="size-form-garment-options"
                    value={garment}
                    maxLength={SIZE_LIMITS.maxGarmentLength}
                    placeholder="Ej: Camisa, Saco, Pantalón"
                    autoComplete="off"
                    aria-describedby="size-form-garment-hint"
                    onChange={(e) => setGarment(e.target.value)}
                />
                <datalist id="size-form-garment-options">
                    {garmentSuggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
                </datalist>
                <p id="size-form-garment-hint" className="size-form__hint">Dejalo vacío si las medidas valen para cualquier prenda.</p>
            </div>

            <div className="size-form__field">
                <label htmlFor="size-form-name">Nombre del talle</label>
                <input
                    id="size-form-name"
                    type="text"
                    value={name}
                    maxLength={SIZE_LIMITS.maxNameLength}
                    placeholder="Ej: XL o 38"
                    aria-invalid={Boolean(nameError)}
                    aria-describedby={nameError ? 'size-form-name-hint size-form-name-error' : 'size-form-name-hint'}
                    onChange={(e) => { setName(e.target.value); setNameError(''); }}
                />
                <p id="size-form-name-hint" className="size-form__hint">El talle en sí: XS, M, XL, 38…</p>
                {nameError && <p id="size-form-name-error" className="size-form__error" role="alert">{nameError}</p>}
            </div>

            <MeasurementsEditor rows={rows} onChange={setRows} idPrefix="size-form" disabled={saving} />

            {formError && <p className="size-form__error" role="alert">{formError}</p>}

            <div className="size-form__actions">
                <button type="button" className="admin-btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
                <button type="submit" className="admin-btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </form>
    );
};

const SizeFormModal = ({ isOpen, onClose, size, onSaved, garmentSuggestions }: SizeFormModalProps) => (
    <Modal isOpen={isOpen} onClose={onClose} title={size ? 'Editar talle' : 'Nuevo talle'}>
        <SizeFormBody size={size} onClose={onClose} onSaved={onSaved} garmentSuggestions={garmentSuggestions} />
    </Modal>
);

export default SizeFormModal;
