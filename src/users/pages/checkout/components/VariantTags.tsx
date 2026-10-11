import type { UnitVariants } from '../../../../store/cartStore';
import { parseColorOption } from '../../../../utils/constants';
import { allUnitsShareVariants } from '../../../../utils/formatters';
import './VariantTags.css';

const isColorVariant = (name: string): boolean => name.toLowerCase() === 'color';

const VariantTagRow = ({ variants }: { variants: UnitVariants }) => (
  <>
    {Object.entries(variants).map(([name, value]) => {
      const color = isColorVariant(name) ? parseColorOption(value) : null;
      return (
        <span key={name} className="variant-tag">
          {color && (
            // El color viene del producto (dato dinámico), por eso va inline.
            <span className="variant-tag__dot" style={{ backgroundColor: color.hex }} aria-hidden="true" />
          )}
          <span className="variant-tag__name">{name}:</span> {color ? color.name : value.toUpperCase()}
        </span>
      );
    })}
  </>
);

interface VariantTagsProps {
  unitVariants: UnitVariants[];
}

/** Variantes de un ítem: una sola fila si todas las unidades coinciden, o una fila por unidad. */
const VariantTags = ({ unitVariants }: VariantTagsProps) => {
  if (allUnitsShareVariants(unitVariants)) {
    const shared = unitVariants[0] ?? {};
    if (Object.keys(shared).length === 0) return null;
    return (
      <div className="variant-tags">
        <VariantTagRow variants={shared} />
      </div>
    );
  }

  return (
    <ul className="variant-tags variant-tags--per-unit">
      {unitVariants.map((variants, index) => (
        <li key={index} className="variant-tags__unit">
          <span className="variant-tags__unit-label">Unidad {index + 1}:</span>
          <VariantTagRow variants={variants} />
        </li>
      ))}
    </ul>
  );
};

export default VariantTags;
