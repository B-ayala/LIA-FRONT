import { SIZE_GUIDE_INFO_LIMITS, type SizeGuideContent, type StandardMeasure } from '../types/sizeGuideContent';
import type { SizeGuideFitReference } from '../types/product';
import { isHttpsUrl, MEASUREMENT_BASIS_TOKEN, sanitizeNotes, trimmedFit } from './sizeGuideInfo';

export const DEFAULT_SIZE_GUIDE_CONTENT: SizeGuideContent = {
  howToMeasure: {
    bust: 'Pasá la cinta métrica alrededor de la parte más plena del busto, manteniéndola nivelada.',
    waist: 'Medí alrededor de la parte más estrecha de tu cintura. La ubicación puede variar según el cuerpo; como orientación, suele encontrarse por encima del ombligo.',
    hips: 'Medí alrededor de la parte más plena de tus caderas y glúteos.',
    inseam: 'Medí desde la parte más alta del interior de la pierna hasta el tobillo.',
  },
  notes: [
    `Las medidas de la tabla corresponden a ${MEASUREMENT_BASIS_TOKEN}.`,
    'Las medidas pueden presentar variaciones según el modelo, el tejido y el proceso de confección.',
    'Si estás entre dos talles, consultá las medidas y las recomendaciones de calce antes de elegir.',
    'Si tenés dudas, contactanos para recibir ayuda para elegir el talle adecuado.',
  ],
};

const MEASURES: StandardMeasure[] = ['bust', 'waist', 'hips', 'inseam'];

const cleanText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const validHeight = (value: unknown): number | undefined => {
  const { minModelHeightCm, maxModelHeightCm } = SIZE_GUIDE_INFO_LIMITS;
  return typeof value === 'number' && Number.isInteger(value) && value >= minModelHeightCm && value <= maxModelHeightCm
    ? value
    : undefined;
};

/**
 * Modelo general leída de `site_content`: se escribe directo desde el admin (sin pasar por el backend),
 * así que acá se aplican las mismas reglas que el schema de productos.
 */
const sanitizeFitReference = (value: unknown): SizeGuideFitReference | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const { maxFitSizeLength, maxFitTextLength, maxFitNotesLength } = SIZE_GUIDE_INFO_LIMITS;
  const image = cleanText(raw.image, 2048);
  return trimmedFit({
    modelHeightCm: validHeight(raw.modelHeightCm),
    topSize: cleanText(raw.topSize, maxFitSizeLength),
    bottomSize: cleanText(raw.bottomSize, maxFitSizeLength),
    fittedSize: cleanText(raw.fittedSize, maxFitSizeLength),
    fit: cleanText(raw.fit, maxFitTextLength),
    notes: cleanText(raw.notes, maxFitNotesLength),
    image: isHttpsUrl(image) ? image : undefined,
  });
};

/** Lo publicado por el admin; cada texto vacío o faltante cae al de por defecto. La modelo no tiene default. */
export const normalizeSizeGuideContent = (value: unknown): SizeGuideContent => {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const rawHowTo = raw.howToMeasure && typeof raw.howToMeasure === 'object'
    ? (raw.howToMeasure as Record<string, unknown>)
    : {};
  const howToMeasure = Object.fromEntries(MEASURES.map((measure) => [
    measure,
    cleanText(rawHowTo[measure], SIZE_GUIDE_INFO_LIMITS.maxHowToLength) || DEFAULT_SIZE_GUIDE_CONTENT.howToMeasure[measure],
  ])) as Record<StandardMeasure, string>;
  // Una lista publicada vacía es una decisión del admin (sin aclaraciones), no un faltante.
  const notes = Array.isArray(raw.notes) ? sanitizeNotes(raw.notes) : [...DEFAULT_SIZE_GUIDE_CONTENT.notes];
  const fitReference = sanitizeFitReference(raw.fitReference);
  return fitReference ? { howToMeasure, notes, fitReference } : { howToMeasure, notes };
};
