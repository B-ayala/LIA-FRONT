import React from 'react';
import type { SizeGuide } from '../../../types/product';
import './VariantTable.css';

interface VariantTableProps {
  sizeGuide?: SizeGuide;
  sizes?: string[];
}

const VariantTable: React.FC<VariantTableProps> = ({ sizeGuide, sizes = [] }) => {
  const rows = (sizeGuide?.rows ?? []).filter(row => row.label.trim());
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
                {cols.map(size => {
                  const value = row.values[size]?.trim();
                  // Una celda vacía es un dato que falta, no un "no aplica": se dice explícitamente.
                  return (
                    <td key={size} className={`variant-cell variant-value-cell${value ? '' : ' variant-value-cell--pending'}`}>
                      {value || 'Pendiente'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VariantTable;
