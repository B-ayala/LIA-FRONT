import { useMemo } from 'react';
import { Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SizeGuide } from '../../../types/product';
import type { Size } from '../../../types/size';
import { groupSizesByGarment } from '../../../utils/sizeGarment';
import { findColumnBySizeId } from '../../../utils/sizeGuideColumns';
import type { SizeGuideCatalog } from './sizeGuideCatalog';

interface GlobalSizesPickerProps {
  guide: SizeGuide;
  catalog: SizeGuideCatalog;
  onToggle: (size: Size, selected: boolean) => void;
}

/** Talles del tipo de la guía: los activos y los desactivados que la guía ya usa. */
const selectableSizes = (guide: SizeGuide, sizes: Size[]): Size[] =>
  sizes.filter((size) => size.type === (guide.type ?? 'indumentaria') && (size.active || findColumnBySizeId(guide, size.id) !== undefined));

const GlobalSizesPicker = ({ guide, catalog, onToggle }: GlobalSizesPickerProps) => {
  const groups = useMemo(() => groupSizesByGarment(selectableSizes(guide, catalog.sizes)), [guide, catalog.sizes]);

  const renderBody = () => {
    if (catalog.status === 'loading' || catalog.status === 'idle') {
      return <p className="size-guide-globals__note" role="status">Cargando talles globales…</p>;
    }
    if (catalog.status === 'error') {
      return (
        <p className="size-guide-globals__note size-guide-globals__note--error">
          {catalog.error || 'No pudimos cargar los talles globales.'}{' '}
          <button type="button" className="size-guide-globals__retry" onClick={catalog.reload}>Reintentar</button>
          {' '}Mientras tanto podés agregar talles propios.
        </p>
      );
    }
    if (groups.length === 0) {
      return (
        <p className="size-guide-globals__note">
          Todavía no hay talles globales de este tipo. Creálos en la sección{' '}
          <Link to="/admin/sizes" target="_blank" rel="noopener noreferrer">Talles</Link>.
        </p>
      );
    }
    return groups.map((group) => (
      <div key={group.label} className="size-guide-globals__group" role="group" aria-label={`Talles globales: ${group.label}`}>
        <span className="size-guide-globals__group-label">{group.label}</span>
        <div className="size-guide-globals__chips">
          {group.sizes.map((size) => {
            const selected = findColumnBySizeId(guide, size.id) !== undefined;
            return (
              <button
                key={size.id}
                type="button"
                aria-pressed={selected}
                className={`size-guide-globals__chip${selected ? ' size-guide-globals__chip--on' : ''}`}
                onClick={() => onToggle(size, selected)}
              >
                {selected ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                {size.name}{size.active ? '' : ' (desactivado)'}
              </button>
            );
          })}
        </div>
      </div>
    ));
  };

  return (
    <div className="size-guide-globals">
      <span className="size-guide-cols-label" id="size-guide-globals-title">Talles globales:</span>
      <p className="size-guide-globals__hint">Los creaste en la sección Talles. Tocá uno para sumarlo a la guía.</p>
      <div aria-labelledby="size-guide-globals-title">{renderBody()}</div>
    </div>
  );
};

export default GlobalSizesPicker;
