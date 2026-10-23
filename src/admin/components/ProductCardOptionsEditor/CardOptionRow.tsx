import { createElement, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Trash2, GripVertical, Eye, EyeOff, Pencil, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import CardOptionIconPicker from '../CardOptionIconPicker/CardOptionIconPicker';
import { getCardOptionIcon } from '../../../utils/cardOptionIcons';
import { MAX_CARD_OPTION_LABEL_LENGTH, type ProductOwnCardOption } from '../../../types/productCardOption';

export interface CardOptionRowData extends ProductOwnCardOption {
    uid: string;
}

interface CardOptionRowProps {
    option: CardOptionRowData;
    canMoveUp: boolean;
    canMoveDown: boolean;
    /** Devuelve el mensaje de error de validación o null si el texto es válido. */
    validateLabel: (label: string) => string | null;
    onSave: (uid: string, label: string, icon: string) => void;
    onToggle: (uid: string) => void;
    onMove: (uid: string, direction: -1 | 1) => void;
    onDelete: (uid: string) => void;
}

const CardOptionRow = ({ option, canMoveUp, canMoveDown, validateLabel, onSave, onToggle, onMove, onDelete }: CardOptionRowProps) => {
    const dragControls = useDragControls();
    const [editing, setEditing] = useState(false);
    const [label, setLabel] = useState(option.label);
    const [icon, setIcon] = useState(option.icon);
    const [error, setError] = useState<string | null>(null);

    const startEdit = () => {
        setLabel(option.label);
        setIcon(option.icon);
        setError(null);
        setEditing(true);
    };

    const save = () => {
        const validation = validateLabel(label);
        if (validation) {
            setError(validation);
            return;
        }
        onSave(option.uid, label.trim(), icon);
        setEditing(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            save();
        } else if (event.key === 'Escape') {
            event.stopPropagation();
            setEditing(false);
        }
    };

    return (
        <Reorder.Item value={option} dragListener={false} dragControls={dragControls} className="card-option-item">
            <div
                className="drag-handle"
                onPointerDown={(event) => dragControls.start(event)}
                aria-hidden="true"
            >
                <GripVertical size={20} />
            </div>

            {editing ? (
                <div className="card-option-edit">
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => { setLabel(e.target.value); setError(null); }}
                        onKeyDown={handleKeyDown}
                        maxLength={MAX_CARD_OPTION_LABEL_LENGTH}
                        aria-label="Texto de la opción"
                        aria-invalid={error !== null}
                        autoFocus
                    />
                    {error && <p className="card-options-editor__error" role="alert">{error}</p>}
                    <CardOptionIconPicker value={icon} onChange={setIcon} />
                </div>
            ) : (
                <div className={`card-option-preview ${option.isActive ? '' : 'is-inactive'}`}>
                    {createElement(getCardOptionIcon(option.icon), { size: 16, 'aria-hidden': true })}
                    <span>{option.label}</span>
                </div>
            )}

            <div className="card-option-actions">
                {editing ? (
                    <>
                        <button type="button" className="admin-action-btn" onClick={save} aria-label="Guardar cambios" title="Guardar">
                            <Check size={18} />
                        </button>
                        <button type="button" className="admin-action-btn" onClick={() => setEditing(false)} aria-label="Cancelar edición" title="Cancelar">
                            <X size={18} />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            className={`status-toggle ${option.isActive ? 'active' : 'inactive'}`}
                            onClick={() => onToggle(option.uid)}
                            aria-pressed={option.isActive}
                            aria-label={`${option.label}: ${option.isActive ? 'activa' : 'inactiva'}`}
                        >
                            {option.isActive ? <><Eye size={16} /> Activa</> : <><EyeOff size={16} /> Inactiva</>}
                        </button>
                        <button type="button" className="admin-action-btn" onClick={() => onMove(option.uid, -1)} disabled={!canMoveUp} aria-label={`Subir ${option.label}`} title="Subir">
                            <ChevronUp size={18} />
                        </button>
                        <button type="button" className="admin-action-btn" onClick={() => onMove(option.uid, 1)} disabled={!canMoveDown} aria-label={`Bajar ${option.label}`} title="Bajar">
                            <ChevronDown size={18} />
                        </button>
                        <button type="button" className="admin-action-btn" onClick={startEdit} aria-label={`Editar ${option.label}`} title="Editar">
                            <Pencil size={18} />
                        </button>
                        <button type="button" className="admin-action-btn delete" onClick={() => onDelete(option.uid)} aria-label={`Eliminar ${option.label}`} title="Eliminar">
                            <Trash2 size={18} />
                        </button>
                    </>
                )}
            </div>
        </Reorder.Item>
    );
};

export default CardOptionRow;
