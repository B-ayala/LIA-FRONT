import { Plus, X } from 'lucide-react';
import { SIZE_LIMITS } from '../../../types/size';
import type { MeasurementRow } from '../../../utils/sizeMeasurements';
import './MeasurementsEditor.css';

interface MeasurementsEditorProps {
    rows: MeasurementRow[];
    onChange: (rows: MeasurementRow[]) => void;
    /** Prefijo único para ids/labels cuando hay más de un editor en pantalla. */
    idPrefix: string;
    disabled?: boolean;
}

const MeasurementsEditor = ({ rows, onChange, idPrefix, disabled = false }: MeasurementsEditorProps) => {
    const canAdd = rows.length < SIZE_LIMITS.maxMeasurements;

    const updateRow = (index: number, patch: Partial<MeasurementRow>) =>
        onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

    return (
        <fieldset className="measurements-editor" disabled={disabled}>
            <legend className="measurements-editor__legend">
                Medidas <span className="measurements-editor__optional">(opcional, hasta {SIZE_LIMITS.maxMeasurements})</span>
            </legend>
            {rows.length === 0 && (
                <p className="measurements-editor__empty">Sin medidas. Podés agregar, por ejemplo, "Pecho" con "86 cm".</p>
            )}
            {rows.map((row, index) => (
                <div className="measurements-editor__row" key={index}>
                    <div className="measurements-editor__field">
                        <label htmlFor={`${idPrefix}-key-${index}`}>Medida {index + 1}</label>
                        <input
                            id={`${idPrefix}-key-${index}`}
                            type="text"
                            value={row.key}
                            maxLength={SIZE_LIMITS.maxMeasurementKeyLength}
                            placeholder="Ej: Pecho"
                            onChange={(e) => updateRow(index, { key: e.target.value })}
                        />
                    </div>
                    <div className="measurements-editor__field">
                        <label htmlFor={`${idPrefix}-value-${index}`}>Valor {index + 1}</label>
                        <input
                            id={`${idPrefix}-value-${index}`}
                            type="text"
                            value={row.value}
                            maxLength={SIZE_LIMITS.maxMeasurementValueLength}
                            placeholder="Ej: 86 cm"
                            onChange={(e) => updateRow(index, { value: e.target.value })}
                        />
                    </div>
                    <button
                        type="button"
                        className="measurements-editor__remove"
                        aria-label={`Quitar medida ${row.key || index + 1}`}
                        onClick={() => onChange(rows.filter((_, i) => i !== index))}
                    >
                        <X size={16} aria-hidden="true" />
                    </button>
                </div>
            ))}
            <button
                type="button"
                className="admin-btn-secondary measurements-editor__add"
                disabled={!canAdd}
                onClick={() => onChange([...rows, { key: '', value: '' }])}
            >
                <Plus size={16} aria-hidden="true" /> Agregar medida
            </button>
        </fieldset>
    );
};

export default MeasurementsEditor;
