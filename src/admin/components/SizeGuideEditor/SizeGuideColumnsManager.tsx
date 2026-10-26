import { useState } from 'react';
import type { SizeGuide } from '../../../types/product';
import type { Size } from '../../../types/size';
import {
  addCustomColumn,
  addGlobalColumn,
  findColumnBySizeId,
  removeColumn,
  type GuideChange,
} from '../../../utils/sizeGuideColumns';
import CustomColumnAdd from './CustomColumnAdd';
import GlobalSizesPicker from './GlobalSizesPicker';
import GuideColumnChips from './GuideColumnChips';
import type { SizeGuideCatalog } from './sizeGuideCatalog';
import './SizeGuideEditor.css';

interface SizeGuideColumnsManagerProps {
  guide: SizeGuide;
  catalog: SizeGuideCatalog;
  onChange: (guide: SizeGuide) => void;
}

/** Columnas (talles) de la guía: globales del catálogo + propios de este producto. */
const SizeGuideColumnsManager = ({ guide, catalog, onChange }: SizeGuideColumnsManagerProps) => {
  const [error, setError] = useState('');

  const apply = (change: GuideChange): boolean => {
    if (!change.ok) {
      setError(change.error);
      return false;
    }
    setError('');
    onChange(change.guide);
    return true;
  };

  const removeFromGuide = (column: string) => {
    setError('');
    onChange(removeColumn(guide, column));
  };

  const toggleGlobal = (size: Size, selected: boolean) => {
    const column = selected ? findColumnBySizeId(guide, size.id) : undefined;
    if (column === undefined) apply(addGlobalColumn(guide, size));
    else removeFromGuide(column);
  };

  return (
    <div className="size-guide-columns">
      <GlobalSizesPicker guide={guide} catalog={catalog} onToggle={toggleGlobal} />
      <div className="size-guide-cols-manager">
        <span className="size-guide-cols-label">Talles de la guía:</span>
        <div className="size-guide-cols-chips">
          <GuideColumnChips guide={guide} onRemove={removeFromGuide} />
          <CustomColumnAdd
            placeholder={guide.type === 'calzado' ? 'Ej: 43' : 'Ej: XXXL'}
            onAdd={(rawName) => apply(addCustomColumn(guide, rawName))}
          />
        </div>
      </div>
      <p className="size-guide-columns__error" role="status" aria-live="polite">{error}</p>
    </div>
  );
};

export default SizeGuideColumnsManager;
