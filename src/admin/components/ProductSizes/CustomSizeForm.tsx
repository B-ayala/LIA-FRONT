import { useRef, useState, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { SIZE_LIMITS, type SizeMeasurements } from '../../../types/size';
import { findDuplicateMeasurementError, rowsToMeasurements, type MeasurementRow } from '../../../utils/sizeOptionMeta';
import MeasurementsEditor from '../SizeForm/MeasurementsEditor';

interface CustomSizeFormProps {
    /** Devuelve el mensaje de error, o null si se agregó. */
    onAdd: (name: string, measurements: SizeMeasurements) => string | null;
}

const CustomSizeForm = ({ onAdd }: CustomSizeFormProps) => {
    const [name, setName] = useState('');
    const [rows, setRows] = useState<MeasurementRow[]>([]);
    const [showMeasurements, setShowMeasurements] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const submit = () => {
        const measurementsError = findDuplicateMeasurementError(rows);
        if (measurementsError) {
            setError(measurementsError);
            return;
        }
        const addError = onAdd(name, rowsToMeasurements(rows));
        setError(addError ?? '');
        if (addError) return;
        setName('');
        setRows([]);
        setShowMeasurements(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        submit();
    };

    return (
        <section className="product-sizes__block" aria-labelledby="product-sizes-custom-title">
            <h4 className="product-sizes__title" id="product-sizes-custom-title">Agregar talle propio</h4>
            <p className="product-sizes__hint">Solo existe en este producto: no entra al catálogo ni se ve en la sección Talles.</p>
            <label className="product-sizes__label" htmlFor="custom-size-name">Nombre del talle</label>
            <div className="product-sizes__add-row">
                <input
                    id="custom-size-name"
                    ref={inputRef}
                    type="text"
                    value={name}
                    maxLength={SIZE_LIMITS.maxNameLength}
                    placeholder="Ej: XXXL o 44"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'custom-size-error' : undefined}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    onKeyDown={handleKeyDown}
                />
                <button type="button" className="admin-btn-secondary product-sizes__add-btn" onClick={submit}>
                    <Plus size={16} aria-hidden="true" /> Agregar
                </button>
            </div>
            {error && <p id="custom-size-error" className="product-sizes__error" role="alert">{error}</p>}
            <button
                type="button"
                className="product-sizes__link-btn"
                aria-expanded={showMeasurements}
                onClick={() => setShowMeasurements((prev) => !prev)}
            >
                {showMeasurements ? 'Ocultar medidas' : 'Agregar medidas (opcional)'}
            </button>
            {showMeasurements && <MeasurementsEditor rows={rows} onChange={setRows} idPrefix="custom-size" />}
        </section>
    );
};

export default CustomSizeForm;
