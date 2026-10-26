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

export const SIZE_LIMITS = {
  maxMeasurements: 8,
  maxMeasurementKeyLength: 30,
  maxMeasurementValueLength: 20,
  maxNameLength: 20,
  maxGarmentLength: 30,
} as const;
