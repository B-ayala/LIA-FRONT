import {
  SIZE_LIMITS,
  type OptionMetaMap,
  type Size,
  type SizeMeasurements,
  type SizeOptionMeta,
} from '../types/size';

/** Forma en que se compara y guarda el nombre de un talle: sin espacios y en MAYÚSCULAS. */
export const toSizeKey = (name: string): string => name.trim().toUpperCase();

/** Descarta medidas sin nombre, recorta textos a los límites del backend y respeta el máximo. */
export const sanitizeMeasurements = (raw?: SizeMeasurements | null): SizeMeasurements => {
  const entries = Object.entries(raw ?? {})
    .map(([key, value]) => [
      key.trim().slice(0, SIZE_LIMITS.maxMeasurementKeyLength),
      String(value ?? '').trim().slice(0, SIZE_LIMITS.maxMeasurementValueLength),
    ] as const)
    .filter(([key]) => key.length > 0)
    .slice(0, SIZE_LIMITS.maxMeasurements);
  return Object.fromEntries(entries);
};

const sanitizeMeta = (meta: SizeOptionMeta | undefined): SizeOptionMeta | undefined => {
  if (!meta) return undefined;
  if (meta.source === 'global') {
    // Sin sizeId no hay a qué catálogo apuntar: se descarta y queda como talle propio.
    return meta.sizeId ? { source: 'global', sizeId: meta.sizeId } : undefined;
  }
  if (meta.source !== 'custom') return undefined;
  const measurements = sanitizeMeasurements(meta.measurements);
  return Object.keys(measurements).length > 0
    ? { source: 'custom', measurements }
    : { source: 'custom' };
};

/** Conserva solo metadatos de opciones que siguen existiendo; `undefined` si no queda ninguno. */
export const pruneOptionMeta = (options: string[], optionMeta?: OptionMetaMap | null): OptionMetaMap | undefined => {
  if (!optionMeta) return undefined;
  const result: OptionMetaMap = {};
  for (const option of options) {
    const meta = sanitizeMeta(optionMeta[option]);
    if (meta) result[option] = meta;
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

export const isGlobalOption = (optionMeta: OptionMetaMap | undefined, option: string): boolean =>
  optionMeta?.[option]?.source === 'global';

/** Un talle sin metadatos se considera propio (productos anteriores al catálogo). */
export const getOptionSource = (optionMeta: OptionMetaMap | undefined, option: string) =>
  isGlobalOption(optionMeta, option) ? 'global' : 'custom';

export const findOptionBySizeId = (
  options: string[],
  optionMeta: OptionMetaMap | undefined,
  sizeId: string,
): string | undefined => options.find((option) => optionMeta?.[option]?.sizeId === sizeId);

export interface SizeSelection {
  options: string[];
  optionMeta: OptionMetaMap;
}

export type SizeChangeResult =
  | { ok: true; selection: SizeSelection }
  | { ok: false; error: string };

const fail = (error: string): SizeChangeResult => ({ ok: false, error });

const findOptionByName = (options: string[], name: string): string | undefined => {
  const key = toSizeKey(name);
  return options.find((option) => toSizeKey(option) === key);
};

/** Agrega un talle del catálogo. Solo activos; no pisa un talle propio con el mismo nombre. */
export const addGlobalSize = (selection: SizeSelection, size: Size): SizeChangeResult => {
  if (!size.active) return fail(`El talle ${toSizeKey(size.name)} está desactivado y no se puede agregar.`);

  const existing = findOptionByName(selection.options, size.name);
  if (existing) {
    return fail(isGlobalOption(selection.optionMeta, existing)
      ? `Este producto ya tiene el talle ${existing}.`
      : `Ya cargaste un talle propio "${existing}" en este producto. Quitalo si querés usar el talle global.`);
  }

  const option = toSizeKey(size.name);
  return {
    ok: true,
    selection: {
      options: [...selection.options, option],
      optionMeta: { ...selection.optionMeta, [option]: { source: 'global', sizeId: size.id } },
    },
  };
};

/** Agrega un talle propio del producto, con medidas opcionales. Nunca toca el catálogo. */
export const addCustomSize = (
  selection: SizeSelection,
  rawName: string,
  measurements?: SizeMeasurements,
): SizeChangeResult => {
  const option = toSizeKey(rawName);
  if (!option) return fail('Escribí el nombre del talle.');

  const existing = findOptionByName(selection.options, option);
  if (existing) {
    return fail(isGlobalOption(selection.optionMeta, existing)
      ? `Ya agregaste el talle global ${existing}. Quitalo si querés cargarlo como talle propio.`
      : `El talle ${existing} ya está en este producto.`);
  }

  const cleanMeasurements = sanitizeMeasurements(measurements);
  const meta: SizeOptionMeta = Object.keys(cleanMeasurements).length > 0
    ? { source: 'custom', measurements: cleanMeasurements }
    : { source: 'custom' };

  return {
    ok: true,
    selection: {
      options: [...selection.options, option],
      optionMeta: { ...selection.optionMeta, [option]: meta },
    },
  };
};

/** Quita el talle solo de este producto (el catálogo y otros productos no se tocan). */
export const removeSizeOption = (selection: SizeSelection, option: string): SizeSelection => {
  const optionMeta = { ...selection.optionMeta };
  delete optionMeta[option];
  return { options: selection.options.filter((current) => current !== option), optionMeta };
};

export interface MeasurementRow {
  key: string;
  value: string;
}

export const measurementsToRows = (measurements?: SizeMeasurements): MeasurementRow[] =>
  Object.entries(measurements ?? {}).map(([key, value]) => ({ key, value }));

export const rowsToMeasurements = (rows: MeasurementRow[]): SizeMeasurements =>
  sanitizeMeasurements(Object.fromEntries(rows.map(({ key, value }) => [key, value])));

/** Mensaje de error si dos filas con nombre repiten la medida (sin distinguir mayúsculas). */
export const findDuplicateMeasurementError = (rows: MeasurementRow[]): string | null => {
  const seen = new Set<string>();
  for (const { key } of rows) {
    const normalized = key.trim().toLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) return `La medida "${key.trim()}" está repetida.`;
    seen.add(normalized);
  }
  return null;
};
