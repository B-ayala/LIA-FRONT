import type { SizeGuideFitReference } from './product';

/** Medidas con instrucción e ilustración propia en la guía de talles. */
export type StandardMeasure = 'bust' | 'waist' | 'hips' | 'inseam';

/** Contenido general de la guía (`site_content` clave `size_guide_content`). */
export interface SizeGuideContent {
  howToMeasure: Record<StandardMeasure, string>;
  /** Aclaraciones por defecto. `{medidas}` se reemplaza según la base indicada en cada guía. */
  notes: string[];
  /** Modelo general: la usan los productos de indumentaria que no tengan una propia. Ausente = sin modelo. */
  fitReference?: SizeGuideFitReference;
}

/** Mismos límites que `schemas/sizeGuideSchema.js` del backend. */
export const SIZE_GUIDE_INFO_LIMITS = {
  maxNotes: 8,
  maxNoteLength: 300,
  maxHowToLength: 300,
  maxFitSizeLength: 20,
  maxFitTextLength: 60,
  maxFitNotesLength: 300,
  minModelHeightCm: 100,
  maxModelHeightCm: 230,
  maxMeasurementValueLength: 20,
} as const;
