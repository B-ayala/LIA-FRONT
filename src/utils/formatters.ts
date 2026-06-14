import type { UnitVariants } from '../store/cartStore';
import { parseColorOption } from './constants';

// ─── Price formatting ────────────────────────────────────────────────────────

export const formatPrice = (n: number): string =>
  '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatPriceInt = (n: number): string =>
  '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ─── Date formatting ─────────────────────────────────────────────────────────

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  );
};

// ─── Variant display helpers ─────────────────────────────────────────────────

export const buildVariantLine = (name: string, value: string): string => {
  const isColor = name.toLowerCase() === 'color';
  const display = isColor ? parseColorOption(value).name : value.toUpperCase();
  const label = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return `${label} ${display}`;
};

export const allUnitsShareVariants = (unitVariants: UnitVariants[]): boolean =>
  unitVariants.length <= 1 ||
  unitVariants.every(
    (uv) => JSON.stringify(uv) === JSON.stringify(unitVariants[0])
  );
