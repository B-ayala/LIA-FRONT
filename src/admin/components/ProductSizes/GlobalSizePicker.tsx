import { RefreshCw } from 'lucide-react';
import type { SizeCatalogStatus } from '../../../hooks/useSizeCatalog';
import type { OptionMetaMap, Size, SizeType } from '../../../types/size';
import { findOptionBySizeId } from '../../../utils/sizeOptionMeta';
import { formatSizeLabel, groupSizesByGarment } from '../../../utils/sizeGarment';

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
        return TYPE_ORDER.flatMap(({ type, label }) => {
            const garmentGroups = groupSizesByGarment(visible.filter((size) => size.type === type));
            const onlyGeneral = garmentGroups.length === 1 && garmentGroups[0].garment === null;
            return garmentGroups.map((group) => (
                <div className="product-sizes__group" key={`${type}-${group.label}`}>
                    <span className="product-sizes__group-label">{onlyGeneral ? label : `${label} · ${group.label}`}</span>
                    <div className="product-sizes__checks">
                        {group.sizes.map((size) => {
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
                                    <span>{formatSizeLabel(size)}</span>
                                    {!size.active && <span className="product-sizes__tag product-sizes__tag--warn">desactivado</span>}
                                </label>
                            );
                        })}
                    </div>
                </div>
            ));
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
