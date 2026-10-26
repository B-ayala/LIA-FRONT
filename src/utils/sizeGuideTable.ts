import type { SizeGuide, Variant } from '../types/product';
import type { OptionMetaMap, Size, SizeMeasurements } from '../types/size';

export interface SizeMeasurementRow {
  size: string;
  values: SizeMeasurements;
}

/** Una fila por talle y una columna por medida (unión de las medidas de todos los talles). */
export interface SizeMeasurementTable {
  columns: string[];
  rows: SizeMeasurementRow[];
}

const resolveMeasurements = (
  option: string,
  optionMeta: OptionMetaMap | undefined,
  catalogById: ReadonlyMap<string, Size> | undefined,
): SizeMeasurements => {
  const meta = optionMeta?.[option];
  if (meta?.source === 'global') {
    return (meta.sizeId ? catalogById?.get(meta.sizeId)?.measurements : undefined) ?? {};
  }
  return meta?.measurements ?? {};
};

export const buildSizeMeasurementTable = (
  options: string[],
  optionMeta: OptionMetaMap | undefined,
  catalogById?: ReadonlyMap<string, Size>,
): SizeMeasurementTable => {
  const columns: string[] = [];
  const rows = options.map((size) => {
    const values = resolveMeasurements(size, optionMeta, catalogById);
    for (const column of Object.keys(values)) {
      if (!columns.includes(column)) columns.push(column);
    }
    return { size, values };
  });
  return { columns, rows };
};

export type ResolvedSizeGuide =
  | { kind: 'table'; table: SizeMeasurementTable }
  | { kind: 'legacy'; guide: SizeGuide; sizes: string[] }
  | { kind: 'none' };

/**
 * Qué guía mostrar: la armada con las medidas de los talles del producto; si ninguno tiene
 * medidas, la guía legacy (`size_guide`) mientras exista; si no hay nada, `none`.
 */
export const resolveSizeGuide = (
  sizeVariant: Variant | undefined,
  legacyGuide: SizeGuide | undefined,
  catalogById?: ReadonlyMap<string, Size>,
): ResolvedSizeGuide => {
  const options = sizeVariant?.options ?? [];
  const table = buildSizeMeasurementTable(options, sizeVariant?.optionMeta, catalogById);
  if (table.columns.length > 0) return { kind: 'table', table };
  if (legacyGuide && legacyGuide.rows.length > 0) return { kind: 'legacy', guide: legacyGuide, sizes: options };
  return { kind: 'none' };
};

export const usesGlobalSizes = (sizeVariant: Variant | undefined): boolean =>
  Object.values(sizeVariant?.optionMeta ?? {}).some((meta) => meta.source === 'global');
