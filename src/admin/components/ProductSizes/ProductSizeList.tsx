import { X } from 'lucide-react';
import type { OptionMetaMap, Size } from '../../../types/size';
import { normalizeGarment } from '../../../utils/sizeGarment';
import { getOptionSource } from '../../../utils/sizeOptionMeta';

interface ProductSizeListProps {
    options: string[];
    optionMeta: OptionMetaMap | undefined;
    stockByOption: Record<string, number> | undefined;
    catalogById: ReadonlyMap<string, Size>;
    onStockChange: (option: string, rawValue: string) => void;
    onRemove: (option: string) => void;
}

const formatCustomMeasurements = (optionMeta: OptionMetaMap | undefined, option: string): string => {
    const entries = Object.entries(optionMeta?.[option]?.measurements ?? {});
    return entries.map(([key, value]) => `${key}: ${value || '—'}`).join(' · ');
};

const ProductSizeList = ({ options, optionMeta, stockByOption, catalogById, onStockChange, onRemove }: ProductSizeListProps) => (
    <section className="product-sizes__block" aria-labelledby="product-sizes-list-title">
        <h4 className="product-sizes__title" id="product-sizes-list-title">Talles de este producto</h4>
        {options.length === 0 ? (
            <p className="product-sizes__muted">Todavía no agregaste talles. Elegí uno global o cargá uno propio.</p>
        ) : (
            <ul className="product-sizes__list">
                {options.map((option) => {
                    const isGlobal = getOptionSource(optionMeta, option) === 'global';
                    const sizeId = optionMeta?.[option]?.sizeId;
                    const catalogSize = isGlobal && sizeId !== undefined ? catalogById.get(sizeId) : undefined;
                    const isDisabledGlobal = catalogSize?.active === false;
                    const garment = normalizeGarment(catalogSize?.garment);
                    const measurements = isGlobal ? '' : formatCustomMeasurements(optionMeta, option);
                    return (
                        <li className="product-sizes__item" key={option}>
                            <div className="product-sizes__item-main">
                                <strong className="product-sizes__name">{option}</strong>
                                <span className={`product-sizes__tag ${isGlobal ? 'product-sizes__tag--global' : 'product-sizes__tag--custom'}`}>
                                    {isGlobal ? (garment ? `Global · ${garment}` : 'Global') : 'Propio'}
                                </span>
                                {isDisabledGlobal && <span className="product-sizes__tag product-sizes__tag--warn">desactivado</span>}
                                {measurements && <span className="product-sizes__measures">{measurements}</span>}
                            </div>
                            <label className="product-sizes__stock">
                                <span>Stock</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="0"
                                    value={stockByOption?.[option] ?? 0}
                                    onChange={(e) => onStockChange(option, e.target.value)}
                                    aria-label={`Stock para talle ${option}`}
                                />
                            </label>
                            <button
                                type="button"
                                className="product-sizes__remove"
                                aria-label={`Quitar talle ${option} de este producto`}
                                onClick={() => onRemove(option)}
                            >
                                <X size={16} aria-hidden="true" />
                            </button>
                        </li>
                    );
                })}
            </ul>
        )}
    </section>
);

export default ProductSizeList;
