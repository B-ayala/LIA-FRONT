import type { Size } from '../types/size';

export const GENERAL_GARMENT_LABEL = 'General';
/** Valor del filtro de prenda para "talles sin prenda". */
export const NO_GARMENT_FILTER = '__none__';

/** Prenda lista para enviar: recortada; vacía ⇒ null (aplica a cualquier prenda). */
export const normalizeGarment = (raw: string | null | undefined): string | null => {
  const trimmed = (raw ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

const garmentKey = (garment: string | null): string => (garment ?? '').toLowerCase();

const compareText = (a: string, b: string): number => a.localeCompare(b, 'es', { numeric: true });

/** Prendas distintas del catálogo (sin distinguir mayúsculas; gana la primera escritura), ordenadas. */
export const listGarments = (sizes: Size[]): string[] => {
  const byKey = new Map<string, string>();
  for (const { garment } of sizes) {
    const clean = normalizeGarment(garment);
    if (clean && !byKey.has(garmentKey(clean))) byKey.set(garmentKey(clean), clean);
  }
  return [...byKey.values()].sort(compareText);
};

/** Cumple el filtro: vacío = todas; NO_GARMENT_FILTER = sin prenda; otro valor = esa prenda. */
export const matchesGarmentFilter = (size: Size, filter: string): boolean => {
  if (!filter) return true;
  if (filter === NO_GARMENT_FILTER) return normalizeGarment(size.garment) === null;
  return garmentKey(normalizeGarment(size.garment)) === garmentKey(filter);
};

/** "M · Camisa" cuando tiene prenda; "M" si no. */
export const formatSizeLabel = (size: Pick<Size, 'name' | 'garment'>): string => {
  const garment = normalizeGarment(size.garment);
  return garment ? `${size.name} · ${garment}` : size.name;
};

export interface GarmentGroup {
  /** null = grupo "General" (sin prenda). */
  garment: string | null;
  label: string;
  sizes: Size[];
}

/** Agrupa por prenda: "General" primero, luego las prendas A-Z; talles ordenados por nombre. */
export const groupSizesByGarment = (sizes: Size[]): GarmentGroup[] => {
  const groups = new Map<string, GarmentGroup>();
  for (const size of sizes) {
    const garment = normalizeGarment(size.garment);
    const key = garmentKey(garment);
    const group = groups.get(key) ?? { garment, label: garment ?? GENERAL_GARMENT_LABEL, sizes: [] };
    group.sizes.push(size);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, sizes: [...group.sizes].sort((a, b) => compareText(a.name, b.name)) }))
    .sort((a, b) => {
      if (a.garment === null) return -1;
      if (b.garment === null) return 1;
      return compareText(a.garment, b.garment);
    });
};
