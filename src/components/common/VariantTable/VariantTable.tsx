import React, { useState } from 'react';
import './VariantTable.css';

interface VariantTableProps {
  colors?: { name: string; hex: string }[];
  sizes?: string[];
}

const DEFAULT_COLORS = [
  { name: 'Negro', hex: '#000000' },
  { name: 'Choco', hex: '#4d2600' },
  { name: 'Beige', hex: '#f5f5dc' },
  { name: 'Gris', hex: '#808080' },
];

const DEFAULT_SIZES = ['S', 'M', 'L'];

const VariantTable: React.FC<VariantTableProps> = ({ 
  colors = DEFAULT_COLORS, 
  sizes = DEFAULT_SIZES
}) => {
  // State to hold availability for each color-size combination
  // Format: { colorName: { sizeName: isAvailable } }
  // Since this is a read-only view for users, we'll simulate some varied availability data
  const [stock] = useState<Record<string, Record<string, boolean>>>(() => {
    const initialStock: Record<string, Record<string, boolean>> = {};
    colors.forEach((color, cIdx) => {
      initialStock[color.name] = {};
      sizes.forEach((size, sIdx) => {
        // Create a pseudo-random but deterministic pattern for display purposes
        initialStock[color.name][size] = (cIdx + sIdx) % 3 !== 0; 
      });
    });
    return initialStock;
  });

  return (
    <div className="variant-table-container">
      <div className="variant-table-wrapper">
        <table className="variant-table">
          <thead>
            <tr>
              <th className="variant-col-header first-col">Color / Size</th>
              {sizes.map(size => (
                <th key={size} className="variant-col-header">{size}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map(color => (
              <tr key={color.name} className="variant-row">
                <td className="variant-cell color-cell">
                  <span 
                    className="color-indicator" 
                    style={{ backgroundColor: color.hex }}
                    aria-hidden="true"
                  ></span>
                  {color.name}
                </td>
                {sizes.map(size => {
                  const isAvailable = stock[color.name]?.[size] ?? false;
                  return (
                    <td key={`${color.name}-${size}`} className="variant-cell status-cell">
                      <div
                        className={`status-indicator ${isAvailable ? 'status-available' : 'status-unavailable'}`}
                        aria-label={`${color.name} size ${size} is ${isAvailable ? 'available' : 'unavailable'}`}
                      >
                        {isAvailable ? '✓' : '✕'}
                      </div>
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
