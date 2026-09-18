import { useState, useEffect } from 'react';
import { Reorder } from 'framer-motion';
import { Trash2, GripVertical, Eye, EyeOff, Pencil, Check, X } from 'lucide-react';
import {
    fetchAllProductCardOptions,
    insertProductCardOption,
    updateProductCardOptionDb,
    deleteProductCardOptionDb,
    reorderProductCardOptions,
} from '../../../services/productService';
import type { ProductCardOption } from '../../../types/productCardOption';
import { CARD_OPTION_ICON_KEYS, DEFAULT_CARD_OPTION_ICON, getCardOptionIcon } from '../../../utils/cardOptionIcons';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import './ProductCardOptionsManager.css';

const IconPicker = ({ value, onChange }: { value: string; onChange: (icon: string) => void }) => (
    <div className="card-option-icon-picker" role="radiogroup" aria-label="Ícono">
        {CARD_OPTION_ICON_KEYS.map((key) => {
            const Icon = getCardOptionIcon(key);
            return (
                <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={value === key}
                    className={`card-option-icon-btn ${value === key ? 'active' : ''}`}
                    onClick={() => onChange(key)}
                    title={key}
                >
                    <Icon size={16} />
                </button>
            );
        })}
    </div>
);

const ProductCardOptionsManager = () => {
    const [options, setOptions] = useState<ProductCardOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [newIcon, setNewIcon] = useState(DEFAULT_CARD_OPTION_ICON);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editIcon, setEditIcon] = useState(DEFAULT_CARD_OPTION_ICON);

    useEffect(() => {
        fetchAllProductCardOptions()
            .then(setOptions)
            .catch(() => setError('No se pudieron cargar las opciones de la card.'))
            .finally(() => setLoading(false));
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const label = newLabel.trim();
        if (!label) return;
        setSaving(true);
        setError('');
        try {
            const nextOrder = options.length + 1;
            const created = await insertProductCardOption(label, newIcon, nextOrder);
            setOptions([...options, created]);
            setNewLabel('');
            setNewIcon(DEFAULT_CARD_OPTION_ICON);
        } catch {
            setError('No se pudo agregar la opción.');
        } finally {
            setSaving(false);
        }
    };

    const handleReorder = async (newOrder: ProductCardOption[]) => {
        const updated = newOrder.map((opt, index) => ({ ...opt, order: index + 1 }));
        setOptions(updated);
        try {
            await reorderProductCardOptions(updated.map(opt => ({ id: opt.id, order: opt.order })));
        } catch {
            setError('No se pudo guardar el nuevo orden.');
        }
    };

    const handleToggle = async (option: ProductCardOption) => {
        const isActive = !option.isActive;
        setOptions(prev => prev.map(o => (o.id === option.id ? { ...o, isActive } : o)));
        try {
            await updateProductCardOptionDb(option.id, { is_active: isActive });
        } catch {
            setOptions(prev => prev.map(o => (o.id === option.id ? { ...o, isActive: option.isActive } : o)));
            setError('No se pudo actualizar la opción.');
        }
    };

    const handleDelete = async (id: string) => {
        const previous = options;
        setOptions(prev => prev.filter(o => o.id !== id));
        try {
            await deleteProductCardOptionDb(id);
        } catch {
            setOptions(previous);
            setError('No se pudo eliminar la opción.');
        }
    };

    const startEdit = (option: ProductCardOption) => {
        setEditingId(option.id);
        setEditLabel(option.label);
        setEditIcon(option.icon);
    };

    const cancelEdit = () => setEditingId(null);

    const saveEdit = async (id: string) => {
        const label = editLabel.trim();
        if (!label) return;
        const previous = options;
        setOptions(prev => prev.map(o => (o.id === id ? { ...o, label, icon: editIcon } : o)));
        setEditingId(null);
        try {
            await updateProductCardOptionDb(id, { label, icon: editIcon });
        } catch {
            setOptions(previous);
            setError('No se pudo guardar la edición.');
        }
    };

    return (
        <div className="admin-card card-options-manager">
            <h2 className="admin-card-title">Opciones de la card de producto</h2>
            <p className="admin-card-desc">
                Sellos que se muestran abajo de cada card en los listados (Mercado Pago, cuotas, envío gratis, etc.).
                No afecta el detalle del producto.
            </p>

            {error && (
                <p style={{ color: 'var(--error, #ef4444)', marginBottom: '12px', fontSize: '14px' }}>{error}</p>
            )}

            <form onSubmit={handleAdd} className="add-card-option-form">
                <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Texto de la opción (ej: Envío gratis)"
                    maxLength={40}
                    required
                    disabled={saving}
                />
                <IconPicker value={newIcon} onChange={setNewIcon} />
                <button type="submit" className="admin-btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Añadir opción'}
                </button>
            </form>

            {loading ? (
                <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <LiaLoader size="md" />
                    <span>Cargando opciones...</span>
                </div>
            ) : options.length === 0 ? (
                <div className="empty-state">Todavía no hay opciones configuradas.</div>
            ) : (
                <Reorder.Group axis="y" values={options} onReorder={handleReorder} className="card-options-list">
                    {options.map((option) => {
                        const Icon = getCardOptionIcon(option.icon);
                        const isEditing = editingId === option.id;
                        return (
                            <Reorder.Item key={option.id} value={option} className="card-option-item">
                                <div className="drag-handle">
                                    <GripVertical size={20} />
                                </div>

                                {isEditing ? (
                                    <div className="card-option-edit">
                                        <input
                                            type="text"
                                            value={editLabel}
                                            onChange={(e) => setEditLabel(e.target.value)}
                                            maxLength={40}
                                            autoFocus
                                        />
                                        <IconPicker value={editIcon} onChange={setEditIcon} />
                                    </div>
                                ) : (
                                    <div className="card-option-preview">
                                        <Icon size={16} />
                                        <span>{option.label}</span>
                                    </div>
                                )}

                                <div className="card-option-actions">
                                    {isEditing ? (
                                        <>
                                            <button type="button" className="admin-action-btn" onClick={() => saveEdit(option.id)} title="Guardar">
                                                <Check size={18} />
                                            </button>
                                            <button type="button" className="admin-action-btn" onClick={cancelEdit} title="Cancelar">
                                                <X size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                className={`status-toggle ${option.isActive ? 'active' : 'inactive'}`}
                                                onClick={() => handleToggle(option)}
                                            >
                                                {option.isActive ? <><Eye size={16} /> Activa</> : <><EyeOff size={16} /> Inactiva</>}
                                            </button>
                                            <button type="button" className="admin-action-btn" onClick={() => startEdit(option)} title="Editar">
                                                <Pencil size={18} />
                                            </button>
                                            <button type="button" className="admin-action-btn delete" onClick={() => handleDelete(option.id)} title="Eliminar">
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </Reorder.Item>
                        );
                    })}
                </Reorder.Group>
            )}
        </div>
    );
};

export default ProductCardOptionsManager;
