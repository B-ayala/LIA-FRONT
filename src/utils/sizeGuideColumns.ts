import type { SizeGuide, SizeGuideRow, SizeGuideType } from '../types/product';
import type { Size } from '../types/size';
import { sanitizeMeasurements, toSizeKey } from './sizeMeasurements';
import { defaultMeasureRows, isUntouchedDefaultRows } from './sizeGuideInfo';

export type GuideChange = { ok: true; guide: SizeGuide } | { ok: false; error: string };

export const DEFAULT_SIZE_COLUMNS: Record<SizeGuideType, string[]> = {
  indumentaria: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  calzado: ['35', '36', '37', '38', '39', '40', '41', '42'],
};

const MSG_ALREADY_IN_GUIDE = 'Este talle ya está en la guía.';
const MSG_EMPTY_NAME = 'Escribí el nombre del talle.';
const MSG_INACTIVE = 'Este talle está desactivado y no se puede agregar a la guía.';
const MSG_OTHER_TYPE = 'Este talle es de otro tipo de guía.';

const labelKey = (label: string): string => label.trim().replace(/\s+/g, ' ').toLowerCase();

const columnsOf = (guide: SizeGuide): string[] => guide.columns ?? [];

const findColumn = (guide: SizeGuide, key: string): string | undefined =>
  columnsOf(guide).find((column) => toSizeKey(column) === key);

/** Guía sin `columnSources` vacío: el campo solo viaja si hay algún talle global. */
const withSources = (guide: SizeGuide, sources: NonNullable<SizeGuide['columnSources']>): SizeGuide => {
  const next: SizeGuide = { ...guide };
  if (Object.keys(sources).length > 0) next.columnSources = sources;
  else delete next.columnSources;
  return next;
};

export const isGlobalColumn = (guide: SizeGuide, column: string): boolean =>
  Boolean(guide.columnSources?.[toSizeKey(column)]);

/** Quita de `columnSources` las columnas que ya no existen. */
export const pruneColumnSources = (guide: SizeGuide): SizeGuide => {
  const alive = new Set(columnsOf(guide).map(toSizeKey));
  const kept = Object.entries(guide.columnSources ?? {}).filter(([key]) => alive.has(key));
  return withSources(guide, Object.fromEntries(kept));
};

/** Columna de la guía que viene del talle global `sizeId` (si está elegido). */
export const findColumnBySizeId = (guide: SizeGuide, sizeId: string): string | undefined =>
  columnsOf(guide).find((column) => guide.columnSources?.[toSizeKey(column)]?.sizeId === sizeId);

/** Copia las medidas del catálogo a la guía: crea filas que falten y solo completa celdas vacías. */
const preloadMeasurements = (rows: SizeGuideRow[], column: string, size: Size): SizeGuideRow[] => {
  const next = rows.map((row) => ({ ...row, values: { ...row.values } }));
  for (const [measure, value] of Object.entries(sanitizeMeasurements(size.measurements))) {
    if (!value) continue;
    let row = next.find((candidate) => labelKey(candidate.label) === labelKey(measure));
    if (!row) {
      row = { label: measure, values: {} };
      next.push(row);
    }
    if (!(row.values[column] ?? '').trim()) row.values[column] = value;
  }
  return next;
};

export const addGlobalColumn = (guide: SizeGuide, size: Size): GuideChange => {
  const type = guide.type ?? 'indumentaria';
  if (!size.active) return { ok: false, error: MSG_INACTIVE };
  if (size.type !== type) return { ok: false, error: MSG_OTHER_TYPE };
  const key = toSizeKey(size.name);
  if (!key) return { ok: false, error: MSG_EMPTY_NAME };
  const existing = findColumn(guide, key);
  if (existing) {
    return {
      ok: false,
      error: isGlobalColumn(guide, existing)
        ? MSG_ALREADY_IN_GUIDE
        : `Ya cargaste un talle propio ${key} en esta guía. Quitalo si querés usar el global.`,
    };
  }
  const withColumn: SizeGuide = {
    ...guide,
    columns: [...columnsOf(guide), key],
    rows: preloadMeasurements(guide.rows, key, size),
  };
  return { ok: true, guide: withSources(withColumn, { ...guide.columnSources, [key]: { sizeId: size.id } }) };
};

export const addCustomColumn = (guide: SizeGuide, rawName: string): GuideChange => {
  const key = toSizeKey(rawName);
  if (!key) return { ok: false, error: MSG_EMPTY_NAME };
  const existing = findColumn(guide, key);
  if (existing) {
    return {
      ok: false,
      error: isGlobalColumn(guide, existing)
        ? `El talle global ${key} ya está en la guía. Quitalo si querés usar uno propio.`
        : MSG_ALREADY_IN_GUIDE,
    };
  }
  return { ok: true, guide: { ...guide, columns: [...columnsOf(guide), key] } };
};

/** Quita la columna de la guía (valores y origen incluidos). No toca el catálogo ni otros productos. */
export const removeColumn = (guide: SizeGuide, column: string): SizeGuide => {
  const key = toSizeKey(column);
  const stored = findColumn(guide, key);
  if (stored === undefined) return guide;
  const rows = guide.rows.map((row) => {
    const values = { ...row.values };
    delete values[stored];
    return { ...row, values };
  });
  const sources = { ...guide.columnSources };
  delete sources[key];
  return withSources({ ...guide, columns: columnsOf(guide).filter((c) => c !== stored), rows }, sources);
};

/**
 * Guía nueva para un tipo: sin columnas si el catálogo ya tiene talles activos de ese tipo; si no, las de siempre.
 * En indumentaria trae precargadas las filas Busto/Cintura/Cadera/Entrepierna, sin valores.
 */
export const defaultGuideForType = (type: SizeGuideType, catalogSizes: Size[]): SizeGuide => {
  const hasGlobals = catalogSizes.some((size) => size.active && size.type === type);
  return { type, columns: hasGlobals ? [] : [...DEFAULT_SIZE_COLUMNS[type]], rows: defaultMeasureRows(type) };
};

/** Guía intacta con las columnas de respaldo: el admin todavía no la tocó. */
export const isUntouchedFallbackGuide = (guide: SizeGuide): boolean => {
  const columns = columnsOf(guide);
  const type = guide.type ?? 'indumentaria';
  const defaults = DEFAULT_SIZE_COLUMNS[type];
  return isUntouchedDefaultRows(guide.rows, type)
    && !guide.columnSources
    && columns.length === defaults.length
    && columns.every((column, index) => column === defaults[index]);
};
