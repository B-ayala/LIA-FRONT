import type { Variant } from '../../../types/product';

export type MissingProductField = 'foto' | 'stock' | 'color';

interface ProductCompleteness {
  imageUrls: string[];
  stock: number;
  variants: Variant[];
}

const COLOR_VARIANT_NAME = 'color';

const hasColor = (variants: Variant[]): boolean =>
  variants.some((variant) => variant.name.trim().toLowerCase() === COLOR_VARIANT_NAME && variant.options.length > 0)
  || variants.some((variant) => Object.values(variant.colorsByOption ?? {}).some((colors) => colors.length > 0));

export const getMissingProductFields = ({ imageUrls, stock, variants }: ProductCompleteness): MissingProductField[] => {
  const missing: MissingProductField[] = [];
  if (imageUrls.length === 0) missing.push('foto');
  if (stock <= 0) missing.push('stock');
  if (!hasColor(variants)) missing.push('color');
  return missing;
};

const MISSING_LABEL: Record<MissingProductField, string> = {
  foto: 'una foto',
  stock: 'el stock',
  color: 'el color',
};

const CONFIGURED_LABEL: Record<Exclude<MissingProductField, 'foto'>, string> = {
  stock: 'stock',
  color: 'color',
};

const joinSpanish = (items: string[]): string =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;

// Si faltan stock o color pero el otro sí está configurado, se aclara cuál ya está cargado.
const describeConfigured = (missing: MissingProductField[]): string => {
  const hasStock = !missing.includes('stock');
  const hasColorSet = !missing.includes('color');
  if (hasColorSet && !hasStock) return `Tiene ${CONFIGURED_LABEL.color} configurado, pero falta el stock. `;
  if (hasStock && !hasColorSet) return `Tiene ${CONFIGURED_LABEL.stock} configurado, pero falta el color. `;
  return '';
};

export const buildMissingDataMessage = (missing: MissingProductField[]): string => {
  const onlyStockAndColor = missing.every((field) => field !== 'foto');
  const detail = onlyStockAndColor && missing.length === 1
    ? describeConfigured(missing)
    : `Falta agregar ${joinSpanish(missing.map((field) => MISSING_LABEL[field]))}. `;
  return `${detail}¿Querés continuar igualmente con la vista previa?`;
};
