import { useState, useEffect } from 'react';
import type { Product, Variant } from '../../../types/product';
import type { UnitVariants } from '../../../store/cartStore';
import { parseColorOption } from '../../../utils/constants';
import { allUnitsShareVariants } from '../../../utils/formatters';
import {
  areUnitVariantSelectionsValid,
  getInvalidVariantSelections,
  getMissingVariantSelections,
  isVariantOptionAvailable,
} from '../../../utils/productVariants';
import './PurchaseVariantModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (unitVariants: UnitVariants[]) => void;
  product: Product;
  quantity: number;
  initialVariants: UnitVariants;
  initialUnitVariants?: UnitVariants[];
}

const PurchaseVariantModal = ({
  isOpen,
  onClose,
  onConfirm,
  product,
  quantity,
  initialVariants,
  initialUnitVariants,
}: Props) => {
  const [mode, setMode] = useState<'ask' | 'custom'>('ask');
  const [perUnitVariants, setPerUnitVariants] = useState<UnitVariants[]>([]);
  const [error, setError] = useState('');

  const buildResolvedInitialUnitVariants = (): UnitVariants[] => {
    if (initialUnitVariants && initialUnitVariants.length > 0) {
      return Array.from({ length: quantity }, (_, index) => ({
        ...(initialUnitVariants[index] ?? initialUnitVariants[initialUnitVariants.length - 1] ?? initialVariants),
      }));
    }

    return Array.from({ length: quantity }, () => ({ ...initialVariants }));
  };

  const resolvedInitialUnitVariants = buildResolvedInitialUnitVariants();
  const initialUnitVariantsSignature = JSON.stringify(initialUnitVariants ?? []);
  const initialVariantsSignature = JSON.stringify(initialVariants);

  const allUnitsShareSameVariants = allUnitsShareVariants(resolvedInitialUnitVariants);

  useEffect(() => {
    if (isOpen) {
      setMode(allUnitsShareSameVariants ? 'ask' : 'custom');
      setPerUnitVariants(buildResolvedInitialUnitVariants());
      setError('');
    }
  }, [allUnitsShareSameVariants, initialUnitVariantsSignature, initialVariantsSignature, isOpen, quantity]);

  if (!isOpen) return null;

  const variants = product.variants ?? [];

  const handleUnitVariantChange = (unitIndex: number, variantName: string, option: string) => {
    const variant = variants.find((currentVariant) => currentVariant.name === variantName);

    if (!variant || !isVariantOptionAvailable(variant, option)) {
      return;
    }

    setError('');
    setPerUnitVariants(prev => {
      const updated = [...prev];
      updated[unitIndex] = { ...updated[unitIndex], [variantName]: option };
      return updated;
    });
  };

  const hasInvalidInitialSelection = getInvalidVariantSelections(product, initialVariants).length > 0;

  const validateBeforeConfirm = (nextVariants: UnitVariants[]): boolean => {
    if (areUnitVariantSelectionsValid(product, nextVariants)) {
      setError('');
      return true;
    }

    const invalidUnitIndex = nextVariants.findIndex((selection) => getInvalidVariantSelections(product, selection).length > 0);
    if (invalidUnitIndex >= 0) {
      setError(`La unidad ${invalidUnitIndex + 1} tiene un talle sin stock. Elegí una opción disponible.`);
      return false;
    }

    const missingUnitIndex = nextVariants.findIndex((selection) => getMissingVariantSelections(product, selection).length > 0);
    if (missingUnitIndex >= 0) {
      const missing = getMissingVariantSelections(product, nextVariants[missingUnitIndex]);
      setError(`Completá ${missing.join(', ')} en la unidad ${missingUnitIndex + 1}.`);
      return false;
    }

    setError('Selección de variantes inválida.');
    return false;
  };

  return (
    <div className="pvm-overlay" onClick={onClose}>
      <div className="pvm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pvm-close" onClick={onClose}>✕</button>

        {mode === 'ask' ? (
          <>
            <h3 className="pvm-title">Selección de variantes</h3>
            <p className="pvm-subtitle">
              Estás comprando <strong>{quantity} unidades</strong>. ¿Querés aplicar el mismo color y talle a todas?
            </p>

            <div className="pvm-summary">
              {variants.map(v => {
                const selected = initialVariants[v.name];
                if (!selected) return null;
                const isColor = v.name.toLowerCase() === 'color';
                const { name: colorName, hex } = isColor
                  ? parseColorOption(selected)
                  : { name: selected, hex: '' };
                return (
                  <div key={v.name} className="pvm-summary-item">
                    <span className="pvm-summary-label">{v.name}:</span>
                    {isColor ? (
                      <span className="pvm-summary-color">
                        <span className="pvm-color-dot" style={{ backgroundColor: hex }} />
                        {colorName}
                      </span>
                    ) : (
                      <span className="pvm-summary-value">{selected.toUpperCase()}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pvm-actions">
              <button
                className="pvm-btn pvm-btn--primary"
                onClick={() => {
                  const nextVariants = Array.from({ length: quantity }, () => ({ ...initialVariants }));
                  if (validateBeforeConfirm(nextVariants)) {
                    onConfirm(nextVariants);
                  }
                }}
                disabled={hasInvalidInitialSelection}
              >
                Sí, aplicar a todas las unidades
              </button>
              <button className="pvm-btn pvm-btn--secondary" onClick={() => setMode('custom')}>
                No, personalizar por unidad
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="pvm-title">Configurar cada unidad</h3>
            <div className="pvm-units">
              {Array.from({ length: quantity }, (_, i) => (
                <div key={i} className="pvm-unit">
                  <p className="pvm-unit-title">Unidad {i + 1}</p>
                  {variants.map(v => (
                    <VariantSelector
                      key={v.name}
                      variant={v}
                      selected={perUnitVariants[i]?.[v.name] ?? ''}
                      onChange={(option) => handleUnitVariantChange(i, v.name, option)}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="pvm-actions">
              <button className="pvm-btn pvm-btn--secondary" onClick={() => setMode('ask')}>
                Volver
              </button>
              <button
                className="pvm-btn pvm-btn--primary"
                onClick={() => {
                  if (validateBeforeConfirm(perUnitVariants)) {
                    onConfirm(perUnitVariants);
                  }
                }}
              >
                Confirmar selección
              </button>
            </div>
          </>
        )}

        {(error || hasInvalidInitialSelection) && (
          <p className="pvm-error">
            {error || 'La selección actual incluye un talle sin stock. Elegí uno disponible antes de continuar.'}
          </p>
        )}
      </div>
    </div>
  );
};

interface VariantSelectorProps {
  variant: Variant;
  selected: string;
  onChange: (option: string) => void;
}

const VariantSelector = ({ variant, selected, onChange }: VariantSelectorProps) => {
  const isColor = variant.name.toLowerCase() === 'color';
  const isTalle = variant.name.toLowerCase().startsWith('talle');

  return (
    <div className="pvm-variant">
      <label className="pvm-variant-label">{variant.name}:</label>
      <div className="pvm-variant-options">
        {variant.options.map(option => {
          const isTalleOutOfStock = isTalle && !isVariantOptionAvailable(variant, option);

          const { name: colorName, hex } = isColor
            ? parseColorOption(option)
            : { name: option, hex: '' };
          return isColor ? (
            <button
              key={option}
              className={`pvm-color-circle ${selected === option ? 'pvm-color-circle--selected' : ''}`}
              style={{ backgroundColor: hex }}
              title={colorName}
              onClick={() => onChange(option)}
            />
          ) : (
            <div key={option} className={`pvm-option-wrap${isTalleOutOfStock ? ' pvm-option-wrap--soldout' : ''}`}>
              <button
                className={`pvm-option-btn ${selected === option ? 'pvm-option-btn--selected' : ''}${isTalleOutOfStock ? ' pvm-option-btn--soldout' : ''}`}
                onClick={() => {
                  if (!isTalleOutOfStock) {
                    onChange(option);
                  }
                }}
                disabled={isTalleOutOfStock}
              >
                {isTalle ? option.toUpperCase() : option}
              </button>
              {isTalleOutOfStock && (
                <span className="pvm-option-strike" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PurchaseVariantModal;
