import React from 'react';
import type { SizeGuide } from '../../../types/product';
import './VariantTable.css';

interface VariantTableProps {
  sizeGuide?: SizeGuide;
  sizes?: string[];
}

const VariantTable: React.FC<VariantTableProps> = ({ sizeGuide, sizes = [] }) => {
  const rows = sizeGuide?.rows ?? [];
  const cols = sizeGuide?.columns ?? sizes;

  if (rows.length === 0) {
    return (
      <div className="variant-table-container">
        <p className="variant-table-empty">
          Este producto no tiene guía de talles configurada.
        </p>
      </div>
    );
  }

  return (
    <div className="variant-table-container">
      <div className="variant-table-wrapper">
        <table className="variant-table">
          <thead>
            <tr>
              <th className="variant-col-header first-col">Medida</th>
              {cols.map(size => (
                <th key={size} className="variant-col-header">{size}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="variant-row">
                <td className="variant-cell variant-label-cell">{row.label}</td>
                {cols.map(size => (
                  <td key={size} className="variant-cell variant-value-cell">
                    {row.values[size] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VariantTable;
