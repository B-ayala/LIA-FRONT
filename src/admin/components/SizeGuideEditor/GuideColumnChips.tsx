import { X } from 'lucide-react';
import type { SizeGuide } from '../../../types/product';
import { isGlobalColumn } from '../../../utils/sizeGuideColumns';

interface GuideColumnChipsProps {
  guide: SizeGuide;
  onRemove: (column: string) => void;
}

const GuideColumnChips = ({ guide, onRemove }: GuideColumnChipsProps) => (
  <ul className="size-guide-col-list" aria-label="Talles de la guía">
    {(guide.columns ?? []).map((column) => {
      const global = isGlobalColumn(guide, column);
      return (
        <li key={column} className={`size-guide-col-chip${global ? ' size-guide-col-chip--global' : ''}`}>
          {column}
          <span className="size-guide-col-chip__origin">{global ? 'Global' : 'Propio'}</span>
          <button
            type="button"
            className="size-guide-col-chip__del"
            onClick={() => onRemove(column)}
            aria-label={`Quitar talle ${column} de la guía`}
            title={`Quitar talle ${column} de la guía`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </li>
      );
    })}
  </ul>
);

export default GuideColumnChips;
