import type { UnitVariants } from '../store/cartStore';
import { parseColorOption } from './constants';

// ─── Text normalization ──────────────────────────────────────────────────────

// El catálogo a veces trae texto con espacios sobrantes ("Campera ", "sandalias ")
// cargados desde el admin. Se normaliza en el borde (al leer/guardar) para que el
// resto de la app trabaje siempre con texto limpio: trim + colapso de espacios internos.
export const cleanText = (value?: string | null): string =>
  (value ?? '').trim().replace(/\s+/g, ' ');

// Capitaliza sólo la primera letra, dejando el resto intacto ("campera" → "Campera",
// "ropa interior" → "Ropa interior").
export const capitalizeFirst = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

// Las categorías se muestran y persisten con la primera letra en mayúscula y sin
// espacios sobrantes. El match del filtro compara en minúsculas, así que la
// capitalización no afecta la coincidencia, sólo la presentación.
export const normalizeCategory = (value?: string | null): string =>
  capitalizeFirst(cleanText(value));

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
