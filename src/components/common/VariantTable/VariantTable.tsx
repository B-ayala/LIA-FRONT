import React from 'react';
import LiaLoader from '../LiaLoader/LiaLoader';
import type { SizeCatalogStatus } from '../../../hooks/useSizeCatalog';
import type { ResolvedSizeGuide } from '../../../utils/sizeGuideTable';
import './VariantTable.css';

const NO_VALUE = '—';

interface VariantTableProps {
  guide: ResolvedSizeGuide;
  /** Estado de carga del catálogo de talles (solo relevante si el producto usa talles globales). */
  status?: SizeCatalogStatus;
  error?: string;
  onRetry?: () => void;
}

const MeasurementsTable = ({ guide }: { guide: Extract<ResolvedSizeGuide, { kind: 'table' }> }) => {
  const { columns, rows } = guide.table;
  return (
    <div className="variant-table-wrapper">
      <table className="variant-table">
        <thead>
          <tr>
            <th scope="col" className="variant-col-header first-col">Talle</th>
            {columns.map(column => (
              <th scope="col" key={column} className="variant-col-header">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.size} className="variant-row">
              <th scope="row" className="variant-cell variant-label-cell">{row.size}</th>
              {columns.map(column => (
                <td key={column} className="variant-cell variant-value-cell">
                  {row.values[column] || NO_VALUE}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Guía anterior (size_guide): medidas en filas y talles en columnas.
const LegacyTable = ({ guide }: { guide: Extract<ResolvedSizeGuide, { kind: 'legacy' }> }) => {
  const rows = guide.guide.rows;
  const cols = guide.guide.columns ?? guide.sizes;
  return (
    <div className="variant-table-wrapper">
      <table className="variant-table">
        <thead>
          <tr>
            <th scope="col" className="variant-col-header first-col">Medida</th>
            {cols.map(size => (
              <th scope="col" key={size} className="variant-col-header">{size}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="variant-row">
              <th scope="row" className="variant-cell variant-label-cell">{row.label}</th>
              {cols.map(size => (
                <td key={size} className="variant-cell variant-value-cell">
                  {row.values[size] || NO_VALUE}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const VariantTable: React.FC<VariantTableProps> = ({ guide, status = 'idle', error = '', onRetry }) => {
  if (status === 'loading') {
    return (
      <div className="variant-table-container" role="status" aria-live="polite">
        <LiaLoader size="md" variant="section" label="Cargando guía de talles…" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="variant-table-container" role="alert">
        <p className="variant-table-empty">{error || 'No pudimos cargar la guía de talles.'}</p>
        {onRetry && (
          <button type="button" className="variant-table-retry" onClick={onRetry}>Reintentar</button>
        )}
      </div>
    );
  }

  return (
    <div className="variant-table-container">
      {guide.kind === 'table' && <MeasurementsTable guide={guide} />}
      {guide.kind === 'legacy' && <LegacyTable guide={guide} />}
      {guide.kind === 'none' && (
        <p className="variant-table-empty">Este producto no tiene guía de talles configurada.</p>
      )}
    </div>
  );
};

export default VariantTable;
