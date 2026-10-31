/** Medidas con instrucción e ilustración propia en la guía de talles. */
export type StandardMeasure = 'bust' | 'waist' | 'hips' | 'inseam';

/** Textos globales de la guía (`site_content` clave `size_guide_content`). */
export interface SizeGuideContent {
  howToMeasure: Record<StandardMeasure, string>;
  /** Aclaraciones por defecto. `{medidas}` se reemplaza según la base indicada en cada guía. */
  notes: string[];
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
