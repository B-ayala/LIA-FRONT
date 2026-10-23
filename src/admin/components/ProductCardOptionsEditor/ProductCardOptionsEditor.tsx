import { useState } from 'react';
import { Reorder } from 'framer-motion';
import ConfirmationModal from '../../../components/common/Modal/ConfirmationModal';
import CardOptionIconPicker from '../CardOptionIconPicker/CardOptionIconPicker';
import CardOptionRow, { type CardOptionRowData } from './CardOptionRow';
import { validateCardOptionLabel } from './cardOptionLabel';
import { DEFAULT_CARD_OPTION_ICON } from '../../../utils/cardOptionIcons';
import {
    MAX_CARD_OPTION_LABEL_LENGTH,
    MAX_PRODUCT_CARD_OPTIONS,
    type ProductCardOptionsValue,
} from '../../../types/productCardOption';
import './ProductCardOptionsEditor.css';

interface ProductCardOptionsEditorProps {
    /** null = usar las opciones globales. */
    value: ProductCardOptionsValue;
    onChange: (value: ProductCardOptionsValue) => void;
}

// uid estable por fila: el orden del array es la única identidad que tiene la opción.
const nextUid = () => crypto.randomUUID();

const toRows = (value: ProductCardOptionsValue): CardOptionRowData[] =>
    (value ?? []).map((option) => ({ ...option, uid: nextUid() }));

const toValue = (rows: CardOptionRowData[]) =>
    rows.map(({ label, icon, isActive }) => ({ label, icon, isActive }));

const ProductCardOptionsEditor = ({ value, onChange }: ProductCardOptionsEditorProps) => {
    const [rows, setRows] = useState<CardOptionRowData[]>(() => toRows(value));
    const [newLabel, setNewLabel] = useState('');
    const [newIcon, setNewIcon] = useState(DEFAULT_CARD_OPTION_ICON);
    const [addError, setAddError] = useState<string | null>(null);
    const [confirmGlobals, setConfirmGlobals] = useState(false);

    const useGlobals = value === null;
    const limitReached = rows.length >= MAX_PRODUCT_CARD_OPTIONS;

    const commit = (next: CardOptionRowData[]) => {
        setRows(next);
        onChange(toValue(next));
    };

    const handleUseGlobalsChange = (checked: boolean) => {
        if (!checked) {
            onChange(toValue(rows));
        } else if (rows.length > 0) {
            setConfirmGlobals(true);
        } else {
            onChange(null);
        }
    };

    const discardOwnOptions = () => {
        setConfirmGlobals(false);
        setRows([]);
        onChange(null);
    };

    const labelsExcept = (uid?: string) => rows.filter((row) => row.uid !== uid).map((row) => row.label);

    const handleAdd = () => {
        const validation = validateCardOptionLabel(newLabel, labelsExcept());
        if (validation) {
            setAddError(validation);
            return;
        }
        commit([...rows, { uid: nextUid(), label: newLabel.trim(), icon: newIcon, isActive: true }]);
        setNewLabel('');
        setNewIcon(DEFAULT_CARD_OPTION_ICON);
        setAddError(null);
    };

    const handleMove = (uid: string, direction: -1 | 1) => {
        const from = rows.findIndex((row) => row.uid === uid);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= rows.length) return;
        const next = [...rows];
        [next[from], next[to]] = [next[to], next[from]];
        commit(next);
    };

    const updateRow = (uid: string, patch: Partial<CardOptionRowData>) =>
        commit(rows.map((row) => (row.uid === uid ? { ...row, ...patch } : row)));

    return (
        <div className="card-options-editor">
            <label className="card-options-editor__toggle">
                <input type="checkbox" checked={useGlobals} onChange={(e) => handleUseGlobalsChange(e.target.checked)} />
                Usar opciones globales
            </label>
            <p className="card-options-editor__hint">
                {useGlobals
                    ? 'Esta card muestra los sellos por defecto definidos en Productos. Desactivá esta opción para definir los propios.'
                    : 'Solo se muestran las opciones activas de esta lista, en este orden. Sin ninguna activa, la card no muestra sellos.'}
            </p>

            {!useGlobals && (
                <>
                    <div className="card-options-editor__add">
                        <label htmlFor="card-option-new-label">Nueva opción</label>
                        <input
                            id="card-option-new-label"
                            type="text"
                            value={newLabel}
                            onChange={(e) => { setNewLabel(e.target.value); setAddError(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                            placeholder="Ej: Envío gratis"
                            maxLength={MAX_CARD_OPTION_LABEL_LENGTH}
                            disabled={limitReached}
                            aria-invalid={addError !== null}
                            aria-describedby="card-option-new-help"
                        />
                        <span id="card-option-new-help" className="card-options-editor__counter">
                            {newLabel.length}/{MAX_CARD_OPTION_LABEL_LENGTH}
                        </span>
                        {addError && <p className="card-options-editor__error" role="alert">{addError}</p>}
                        <CardOptionIconPicker value={newIcon} onChange={setNewIcon} />
                        <button type="button" className="admin-btn-secondary" onClick={handleAdd} disabled={limitReached}>
                            Añadir opción
                        </button>
                        {limitReached && (
                            <p className="card-options-editor__hint" role="status">
                                Llegaste al máximo de {MAX_PRODUCT_CARD_OPTIONS} opciones. Eliminá alguna para agregar otra.
                            </p>
                        )}
                    </div>

                    {rows.length === 0 ? (
                        <div className="empty-state">Sin opciones propias: la card no mostrará sellos. Añadí la primera arriba.</div>
                    ) : (
                        <Reorder.Group axis="y" values={rows} onReorder={commit} className="card-options-list">
                            {rows.map((row, index) => (
                                <CardOptionRow
                                    key={row.uid}
                                    option={row}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < rows.length - 1}
                                    validateLabel={(label) => validateCardOptionLabel(label, labelsExcept(row.uid))}
                                    onSave={(uid, label, icon) => updateRow(uid, { label, icon })}
                                    onToggle={(uid) => updateRow(uid, { isActive: !row.isActive })}
                                    onMove={handleMove}
                                    onDelete={(uid) => commit(rows.filter((r) => r.uid !== uid))}
                                />
                            ))}
                        </Reorder.Group>
                    )}
                </>
            )}

            <ConfirmationModal
                isOpen={confirmGlobals}
                onClose={() => setConfirmGlobals(false)}
                title="Volver a las opciones globales"
                message="Se van a descartar las opciones propias de este producto. Esta acción no se puede deshacer."
                status="error"
                actionButtonText="Descartar y usar globales"
                cancelButtonText="Conservar mis opciones"
                onActionClick={discardOwnOptions}
            />
        </div>
    );
};

export default ProductCardOptionsEditor;
