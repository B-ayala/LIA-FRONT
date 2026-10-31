import type {
  SizeGuide,
  SizeGuideFitReference,
  SizeGuideMeasurementBasis,
  SizeGuideRow,
  SizeGuideType,
  SizeGuideUnit,
} from '../types/product';
import { SIZE_GUIDE_INFO_LIMITS, type StandardMeasure } from '../types/sizeGuideContent';
import { toSizeKey } from './sizeMeasurements';

/** Token de las aclaraciones que se reemplaza por "medidas corporales" o "medidas de la prenda". */
export const MEASUREMENT_BASIS_TOKEN = '{medidas}';

/** Limpia una lista de aclaraciones: sin vacías, recortadas y hasta el máximo. */
export const sanitizeNotes = (raw: unknown): string[] =>
  (Array.isArray(raw) ? raw : [])
    .map((note) => (typeof note === 'string' ? note.trim().slice(0, SIZE_GUIDE_INFO_LIMITS.maxNoteLength) : ''))
    .filter(Boolean)
    .slice(0, SIZE_GUIDE_INFO_LIMITS.maxNotes);

export const STANDARD_MEASURES: { key: StandardMeasure; label: string }[] = [
  { key: 'bust', label: 'Busto' },
  { key: 'waist', label: 'Cintura' },
  { key: 'hips', label: 'Cadera' },
  { key: 'inseam', label: 'Entrepierna' },
];

export const MEASUREMENT_BASIS_LABELS: Record<SizeGuideMeasurementBasis, string> = {
  body: 'medidas corporales',
  garment: 'medidas de la prenda',
};

export const UNIT_LABELS: Record<SizeGuideUnit, string> = {
  cm: 'centímetros (cm)',
  mm: 'milímetros (mm)',
};

export type GuideTableStatus = 'empty' | 'partial' | 'complete';

const normalizeLabel = (label: string): string =>
  label.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const isFilled = (value: string | undefined): boolean => Boolean(value?.trim());

const columnsOf = (guide: SizeGuide): string[] => guide.columns ?? [];

/** Filas precargadas de una guía nueva: solo la estructura, sin valores (los carga el admin). */
export const defaultMeasureRows = (type: SizeGuideType): SizeGuideRow[] =>
  type === 'indumentaria' ? STANDARD_MEASURES.map(({ label }) => ({ label, values: {} })) : [];

/** Filas iguales a las precargadas y sin ningún valor: el admin todavía no las tocó. */
export const isUntouchedDefaultRows = (rows: SizeGuideRow[], type: SizeGuideType): boolean => {
  const defaults = defaultMeasureRows(type);
  return rows.length === defaults.length
    && rows.every((row, index) => row.label === defaults[index].label && !Object.values(row.values).some(isFilled));
};

/** Medidas estándar presentes en la tabla, en el orden de las instrucciones. */
const matchedStandardMeasures = (rows: SizeGuideRow[]): StandardMeasure[] => {
  const labels = rows.map((row) => normalizeLabel(row.label));
  return STANDARD_MEASURES
    .filter(({ label }) => labels.some((candidate) => candidate.includes(normalizeLabel(label))))
    .map(({ key }) => key);
};

/**
 * Qué instrucciones de "¿Cómo tomar tus medidas?" corresponden a la guía. Calzado no usa medidas
 * del cuerpo; en indumentaria se explican las que tiene la tabla y, si no tiene ninguna estándar,
 * las cuatro como orientación general.
 */
export const measuresToExplain = (guide: SizeGuide): StandardMeasure[] => {
  if (guide.type === 'calzado') return [];
  const matched = matchedStandardMeasures(guide.rows);
  return matched.length > 0 ? matched : STANDARD_MEASURES.map(({ key }) => key);
};

/** Filas que se publican: con nombre de medida. */
export const publishableRows = (guide: SizeGuide): SizeGuideRow[] => guide.rows.filter((row) => row.label.trim());

/** `empty` = ningún valor cargado; `partial` = faltan celdas; `complete` = tabla completa. */
export const guideTableStatus = (guide: SizeGuide): GuideTableStatus => {
  const columns = columnsOf(guide);
  const cells = publishableRows(guide).flatMap((row) => columns.map((column) => row.values[column]));
  const filled = cells.filter(isFilled).length;
  if (filled === 0) return 'empty';
  return filled === cells.length ? 'complete' : 'partial';
};

/**
 * Aclaraciones a publicar: las propias de la guía o, si no tiene, las globales. La que nombra la base
 * de las medidas solo se muestra si la guía la indica y hay valores en la tabla: sin eso sería afirmar
 * algo que nadie confirmó.
 */
export const resolveGuideNotes = (guide: SizeGuide, globalNotes: string[], status: GuideTableStatus): string[] => {
  const basis = guide.measurementBasis;
  return (guide.notes ?? globalNotes).flatMap((note) => {
    if (!note.includes(MEASUREMENT_BASIS_TOKEN)) return [note];
    if (!basis || status === 'empty') return [];
    return [note.split(MEASUREMENT_BASIS_TOKEN).join(MEASUREMENT_BASIS_LABELS[basis])];
  });
};

/** 170 → "1,70 m". */
export const formatModelHeight = (cm: number): string => `${(cm / 100).toFixed(2).replace('.', ',')} m`;

export interface VisibleFitReference {
  height?: string;
  sizes: { label: string; value: string }[];
  fit?: string;
  notes?: string;
  image?: string;
}

const FIT_SIZE_LABELS: { key: 'topSize' | 'bottomSize' | 'fittedSize'; label: string }[] = [
  { key: 'topSize', label: 'Partes de arriba' },
  { key: 'bottomSize', label: 'Pantalones y prendas inferiores' },
  { key: 'fittedSize', label: 'Calzas, shorts, bermudas y prendas ajustadas' },
];

const HTTPS_URL = /^https:\/\/\S+$/;

/** Misma regla que el backend: la foto solo puede ser una URL https (nada de `javascript:` ni `data:`). */
export const isHttpsUrl = (value: string | undefined): value is string => Boolean(value && HTTPS_URL.test(value));

/**
 * Qué modelo muestra la guía: la propia, ninguna o la general. La general es solo para indumentaria:
 * un calzado no se elige por la altura de una modelo. Sin guía no se sabe el tipo, así que no se muestra.
 */
export const resolveFitReference = (
  guide: SizeGuide | undefined,
  globalFit: SizeGuideFitReference | undefined,
): SizeGuideFitReference | undefined => {
  if (!guide || guide.fitReferenceMode === 'hidden') return undefined;
  if (guide.fitReferenceMode === 'custom') return guide.fitReference;
  return guide.type === 'calzado' ? undefined : globalFit;
};

/** Solo los datos cargados. Sin ningún dato de texto devuelve null: una foto sola no es una referencia. */
export const visibleFitReference = (fit: SizeGuideFitReference | undefined): VisibleFitReference | null => {
  if (!fit) return null;
  const sizes = FIT_SIZE_LABELS
    .map(({ key, label }) => ({ label, value: fit[key]?.trim() ?? '' }))
    .filter(({ value }) => value);
  const visible: VisibleFitReference = {
    height: fit.modelHeightCm ? formatModelHeight(fit.modelHeightCm) : undefined,
    sizes,
    fit: fit.fit?.trim() || undefined,
    notes: fit.notes?.trim() || undefined,
  };
  if (!visible.height && sizes.length === 0 && !visible.fit && !visible.notes) return null;
  if (isHttpsUrl(fit.image)) visible.image = fit.image;
  return visible;
};

const hasFitData = (fit: SizeGuideFitReference | undefined): boolean =>
  Boolean(fit && Object.values(fit).some((value) => (typeof value === 'string' ? value.trim() : value)));

/**
 * La guía tiene algo para guardar: filas propias, base, aclaraciones propias o referencia de calce.
 * Las filas precargadas sin tocar no cuentan: no aportan información y un producto sin talles
 * (ej: accesorios) no tiene por qué guardar una guía vacía.
 */
export const hasGuideContent = (guide: SizeGuide): boolean => {
  const hasOwnRows = guide.rows.length > 0 && !isUntouchedDefaultRows(guide.rows, guide.type ?? 'indumentaria');
  return hasOwnRows || Boolean(guide.measurementBasis) || guide.notes !== undefined
    || guide.fitReferenceMode !== undefined || hasFitData(guide.fitReference);
};

const findRowsProblem = (guide: SizeGuide): string | null => {
  const seen = new Set<string>();
  for (const row of guide.rows) {
    const values = columnsOf(guide).map((column) => [column, row.values[column]?.trim() ?? ''] as const);
    const label = row.label.trim();
    if (!label && values.some(([, value]) => value)) return 'Hay una fila con valores pero sin nombre de medida.';
    if (label && seen.has(normalizeLabel(label))) return `La medida "${label}" está repetida en la guía.`;
    if (label) seen.add(normalizeLabel(label));
    for (const [column, value] of values) {
      if (!value) continue;
      if (value.length > SIZE_GUIDE_INFO_LIMITS.maxMeasurementValueLength) {
        return `${label} / ${column}: máximo ${SIZE_GUIDE_INFO_LIMITS.maxMeasurementValueLength} caracteres.`;
      }
      if (!/\d/.test(value)) return `${label} / ${column}: "${value}" no es una medida. Cargá un número (ej: 86 o 86-90).`;
    }
  }
  return null;
};

/** Primer problema de una referencia de calce (de un producto o la general), o null. */
export const findFitProblem = (fit: SizeGuideFitReference | undefined): string | null => {
  if (!fit) return null;
  const height = fit.modelHeightCm;
  const { minModelHeightCm, maxModelHeightCm } = SIZE_GUIDE_INFO_LIMITS;
  if (height !== undefined && (!Number.isInteger(height) || height < minModelHeightCm || height > maxModelHeightCm)) {
    return `La altura de la modelo va en centímetros, entre ${minModelHeightCm} y ${maxModelHeightCm} (ej: 170).`;
  }
  if (fit.image && !isHttpsUrl(fit.image)) return 'La foto de la modelo no es una imagen válida. Elegila de nuevo.';
  // Sin esto la foto se descartaría al guardar sin avisar (una foto sola no es una referencia).
  if (fit.image && !trimmedFit(fit)) return 'Para mostrar la foto de la modelo, completá al menos su altura o un talle.';
  return null;
};

/** Primer problema que impide publicar la guía, o null. Mismas reglas que el backend más las de contenido. */
export const findGuideProblem = (guide: SizeGuide): string | null => {
  const notes = guide.notes ?? [];
  if (notes.length > SIZE_GUIDE_INFO_LIMITS.maxNotes) return `Máximo ${SIZE_GUIDE_INFO_LIMITS.maxNotes} aclaraciones.`;
  if (notes.some((note) => !note.trim())) return 'Hay una aclaración vacía: completala o quitala.';
  return findRowsProblem(guide) ?? (guide.fitReferenceMode === 'custom' ? findFitProblem(guide.fitReference) : null);
};

/** Referencia con los textos recortados y sin campos vacíos; undefined si no tiene datos de texto. */
export const trimmedFit = (fit: SizeGuideFitReference): SizeGuideFitReference | undefined => {
  const entries = Object.entries(fit)
    .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value] as const)
    .filter(([, value]) => value !== undefined && value !== '');
  // La foto sola no se guarda: sin datos reales la tienda tampoco la mostraría.
  const hasData = entries.some(([key]) => key !== 'image');
  return hasData ? (Object.fromEntries(entries) as SizeGuideFitReference) : undefined;
};

/** Forma final para guardar: textos recortados, sin campos vacíos. No toca columnas ni filas. */
export const cleanGuideInfo = (guide: SizeGuide): SizeGuide => {
  const next: SizeGuide = { ...guide };
  if (guide.notes !== undefined) next.notes = sanitizeNotes(guide.notes);
  const fit = guide.fitReferenceMode === 'custom' && guide.fitReference ? trimmedFit(guide.fitReference) : undefined;
  if (fit) next.fitReference = fit;
  else delete next.fitReference;
  // "Personalizar" sin ningún dato publica lo mismo que "No mostrar": se guarda como tal para que el admin lo vea así.
  if (guide.fitReferenceMode === 'custom' && !fit) next.fitReferenceMode = 'hidden';
  if (!next.measurementBasis) delete next.measurementBasis;
  return next;
};

/** Talles de la guía que el producto no vende (no están en la variante Talle). */
export const guideSizesNotForSale = (guide: SizeGuide, variantSizes: string[]): string[] => {
  if (variantSizes.length === 0) return [];
  const forSale = new Set(variantSizes.map(toSizeKey));
  return columnsOf(guide).filter((column) => !forSale.has(toSizeKey(column)));
};
