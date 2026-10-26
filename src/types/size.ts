export type SizeType = 'indumentaria' | 'calzado';

/** Medida nombrada → valor (ej: { Pecho: "86 cm" }). */
export type SizeMeasurements = Record<string, string>;

/** Talle del catálogo global (`/api/sizes`). Los inactivos siguen existiendo. */
export interface Size {
  id: string;
  name: string;
  type: SizeType;
  /** Prenda a la que aplican las medidas (ej: Camisa); null = cualquier prenda. */
  garment: string | null;
  measurements: SizeMeasurements;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SizeInput {
  name: string;
  type: SizeType;
  /** Vacío o null ⇒ sin prenda; en una edición, null borra la prenda. */
  garment?: string | null;
  measurements?: SizeMeasurements;
}

export type SizeUpdate = Partial<SizeInput> & { active?: boolean };

/** Origen de un talle dentro de un producto: del catálogo o propio del producto. */
export type SizeSource = 'global' | 'custom';

/**
 * Metadatos de un talle de producto. `global` ⇒ `sizeId` y sin medidas (viven en el
 * catálogo); `custom` ⇒ sin `sizeId`, medidas opcionales guardadas en el producto.
 */
export interface SizeOptionMeta {
  source: SizeSource;
  sizeId?: string;
  measurements?: SizeMeasurements;
}

/** Clave = opción de la variante Talle en MAYÚSCULAS. */
export type OptionMetaMap = Record<string, SizeOptionMeta>;

export const SIZE_LIMITS = {
  maxMeasurements: 8,
  maxMeasurementKeyLength: 30,
  maxMeasurementValueLength: 20,
  maxNameLength: 20,
  maxGarmentLength: 30,
} as const;
