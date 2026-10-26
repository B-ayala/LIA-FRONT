import { useState } from 'react';
import { useSizeCatalog } from '../../../hooks/useSizeCatalog';
import type { OptionMetaMap, Size, SizeMeasurements } from '../../../types/size';
import { findOptionBySizeId } from '../../../utils/sizeOptionMeta';
import GlobalSizePicker from './GlobalSizePicker';
import ProductSizeList from './ProductSizeList';
import CustomSizeForm from './CustomSizeForm';
import './ProductSizes.css';

interface ProductSizesEditorProps {
    options: string[];
    optionMeta: OptionMetaMap | undefined;
    stockByOption: Record<string, number> | undefined;
    /** Cada handler devuelve un mensaje de error, o null si el cambio se aplicó. */
    onAddGlobal: (size: Size) => string | null;
    onAddCustom: (name: string, measurements: SizeMeasurements) => string | null;
    onRemove: (option: string) => void;
    onStockChange: (option: string, rawValue: string) => void;
}

/** Variante Talle del producto: tres bloques (globales / del producto / propio). */
const ProductSizesEditor = ({ options, optionMeta, stockByOption, onAddGlobal, onAddCustom, onRemove, onStockChange }: ProductSizesEditorProps) => {
    const catalog = useSizeCatalog();
    const [pickerError, setPickerError] = useState('');

    const handleToggle = (size: Size, isSelected: boolean) => {
        if (isSelected) {
            const option = findOptionBySizeId(options, optionMeta, size.id);
            if (option) onRemove(option);
            setPickerError('');
            return;
        }
        setPickerError(onAddGlobal(size) ?? '');
    };

    return (
        <div className="product-sizes">
            <GlobalSizePicker
                status={catalog.status}
                sizes={catalog.sizes}
                error={catalog.error}
                options={options}
                optionMeta={optionMeta}
                pickerError={pickerError}
                onToggle={handleToggle}
                onRetry={catalog.reload}
            />
            <ProductSizeList
                options={options}
                optionMeta={optionMeta}
                stockByOption={stockByOption}
                catalogById={catalog.byId}
                onStockChange={onStockChange}
                onRemove={onRemove}
            />
            <CustomSizeForm onAdd={onAddCustom} />
        </div>
    );
};

export default ProductSizesEditor;
