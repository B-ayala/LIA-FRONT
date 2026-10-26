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
} from '../../../utils/sizeOptionMeta';
import MeasurementsEditor from './MeasurementsEditor';
import './SizeFormModal.css';

interface SizeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** null = crear un talle nuevo. */
    size: Size | null;
    onSaved: (saved: Size) => void;
}

const TYPE_OPTIONS: { value: SizeType; label: string }[] = [
    { value: 'indumentaria', label: 'Indumentaria' },
    { value: 'calzado', label: 'Calzado' },
];

interface SizeFormBodyProps {
    size: Size | null;
    onClose: () => void;
    onSaved: (saved: Size) => void;
}

// Se monta al abrir el modal (MUI desmonta el contenido al cerrar), así el estado arranca limpio.
const SizeFormBody = ({ size, onClose, onSaved }: SizeFormBodyProps) => {
    const [name, setName] = useState(size?.name ?? '');
    const [type, setType] = useState<SizeType>(size?.type ?? 'indumentaria');
    const [rows, setRows] = useState<MeasurementRow[]>(() => measurementsToRows(size?.measurements));
    const [nameError, setNameError] = useState('');
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

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
            const payload = { name: normalizedName, type, measurements: rowsToMeasurements(rows) };
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
                <label htmlFor="size-form-name">Nombre del talle</label>
                <input
                    id="size-form-name"
                    type="text"
                    autoFocus
                    value={name}
                    maxLength={SIZE_LIMITS.maxNameLength}
                    placeholder="Ej: XL o 38"
                    aria-invalid={Boolean(nameError)}
                    aria-describedby={nameError ? 'size-form-name-error' : undefined}
                    onChange={(e) => { setName(e.target.value); setNameError(''); }}
                />
                {nameError && <p id="size-form-name-error" className="size-form__error" role="alert">{nameError}</p>}
            </div>

            <div className="size-form__field">
                <label htmlFor="size-form-type">Tipo</label>
                <select id="size-form-type" value={type} onChange={(e) => setType(e.target.value as SizeType)}>
                    {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
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

const SizeFormModal = ({ isOpen, onClose, size, onSaved }: SizeFormModalProps) => (
    <Modal isOpen={isOpen} onClose={onClose} title={size ? 'Editar talle' : 'Nuevo talle'}>
        <SizeFormBody size={size} onClose={onClose} onSaved={onSaved} />
    </Modal>
);

export default SizeFormModal;
