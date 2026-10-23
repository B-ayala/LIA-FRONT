import type {
  ProductCardOption,
  ProductCardOptionsValue,
  ProductOwnCardOption,
} from '../types/productCardOption';
import { MAX_CARD_OPTION_LABEL_LENGTH, MAX_PRODUCT_CARD_OPTIONS } from '../types/productCardOption';
import { DEFAULT_CARD_OPTION_ICON } from './cardOptionIcons';

const parseOwnOption = (raw: unknown): ProductOwnCardOption | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const { label, icon, isActive } = raw as Record<string, unknown>;
  if (typeof label !== 'string' || typeof icon !== 'string') return null;
  const trimmed = label.trim();
  if (!trimmed) return null;
  return {
    label: trimmed.slice(0, MAX_CARD_OPTION_LABEL_LENGTH),
    icon,
    isActive: isActive !== false,
  };
};

/** Valida el jsonb leído de `productos.card_options`; cualquier forma inválida se trata como null (globales). */
export const parseProductCardOptions = (raw: unknown): ProductCardOptionsValue => {
  if (!Array.isArray(raw)) return null;
  return raw
    .map(parseOwnOption)
    .filter((option): option is ProductOwnCardOption => option !== null)
    .slice(0, MAX_PRODUCT_CARD_OPTIONS);
};

/** Opciones a mostrar en la card: las propias del producto (solo activas) o, si es null, las globales. */
export const resolveCardOptions = (
  own: ProductCardOptionsValue | undefined,
  globals: ProductCardOption[],
): Pick<ProductCardOption, 'label' | 'icon'>[] => {
  if (own == null) return globals;
  return own
    .filter((option) => option.isActive)
    .map(({ label, icon }) => ({ label, icon: icon || DEFAULT_CARD_OPTION_ICON }));
};
