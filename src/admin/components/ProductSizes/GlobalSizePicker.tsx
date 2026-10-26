import { RefreshCw } from 'lucide-react';
import type { SizeCatalogStatus } from '../../../hooks/useSizeCatalog';
import type { OptionMetaMap, Size, SizeType } from '../../../types/size';
import { findOptionBySizeId } from '../../../utils/sizeOptionMeta';

interface GlobalSizePickerProps {
    status: SizeCatalogStatus;
    sizes: Size[];
    error: string;
    options: string[];
    optionMeta: OptionMetaMap | undefined;
    pickerError: string;
    onToggle: (size: Size, isSelected: boolean) => void;
    onRetry: () => void;
}

const TYPE_ORDER: { type: SizeType; label: string }[] = [
    { type: 'indumentaria', label: 'Indumentaria' },
    { type: 'calzado', label: 'Calzado' },
];

const bySizeName = (a: Size, b: Size) => a.name.localeCompare(b.name, 'es', { numeric: true });

const GlobalSizePicker = ({ status, sizes, error, options, optionMeta, pickerError, onToggle, onRetry }: GlobalSizePickerProps) => {
    const isAssigned = (size: Size) => findOptionBySizeId(options, optionMeta, size.id) !== undefined;
    // Un talle desactivado solo se ofrece si el producto ya lo tiene (para poder quitarlo).
    const visible = sizes.filter((size) => size.active || isAssigned(size));

    const renderBody = () => {
        if (status === 'loading' || status === 'idle') {
            return <p className="product-sizes__muted" role="status" aria-live="polite">Cargando talles globales...</p>;
        }
        if (status === 'error') {
            return (
                <div className="product-sizes__alert" role="alert">
                    <span>{error || 'No pudimos cargar los talles globales.'}</span>
                    <button type="button" className="admin-btn-secondary product-sizes__retry" onClick={onRetry}>
                        <RefreshCw size={14} aria-hidden="true" /> Reintentar
                    </button>
                </div>
            );
        }
        if (visible.length === 0) {
            return (
                <p className="product-sizes__muted">
                    Todavía no hay talles globales activos. Podés crearlos en la sección Talles del menú o agregar un talle propio más abajo.
                </p>
            );
        }
        return TYPE_ORDER.map(({ type, label }) => {
            const group = visible.filter((size) => size.type === type).sort(bySizeName);
            if (group.length === 0) return null;
            return (
                <div className="product-sizes__group" key={type}>
                    <span className="product-sizes__group-label">{label}</span>
                    <div className="product-sizes__checks">
                        {group.map((size) => {
                            const selected = isAssigned(size);
                            return (
                                <label
                                    key={size.id}
                                    className={`product-sizes__check${selected ? ' product-sizes__check--on' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => onToggle(size, selected)}
                                    />
                                    <span>{size.name}</span>
                                    {!size.active && <span className="product-sizes__tag product-sizes__tag--warn">desactivado</span>}
                                </label>
                            );
                        })}
                    </div>
                </div>
            );
        });
    };

    return (
        <fieldset className="product-sizes__block">
            <legend className="product-sizes__title">Talles globales</legend>
            <p className="product-sizes__hint">Elegí cuáles del catálogo usa este producto. Ninguno se agrega solo.</p>
            {renderBody()}
            {pickerError && <p className="product-sizes__error" role="alert">{pickerError}</p>}
        </fieldset>
    );
};

export default GlobalSizePicker;
