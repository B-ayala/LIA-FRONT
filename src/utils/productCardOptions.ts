import type {
  ProductCardOption,
  ProductCardOptionsValue,
  ProductOwnCardOption,
} from '../types/productCardOption';
import { MAX_CARD_OPTION_LABEL_LENGTH, MAX_PRODUCT_CARD_OPTIONS } from '../types/productCardOption';
import { DEFAULT_CARD_OPTION_ICON } from './cardOptionIcons';

// El precio con transferencia sale solo de `productos.transfer_price`: un sello que lo mencione
// sería una segunda fuente que se desincroniza. Misma regla en el backend y en la base.
// "transferencia(s)", "transf." o "transf" suelto; deja pasar "transformá" o "transfiero".
const TRANSFER_LABEL_PATTERN = /\btransf(?:er[eé]ncia|\.|\b)/i;

export const TRANSFER_LABEL_ERROR =
  'El precio con transferencia se carga en Datos Básicos, campo "En transferencia ($)".';

export const mentionsTransfer = (label: string): boolean => TRANSFER_LABEL_PATTERN.test(label);

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

/**
 * Opciones a mostrar en la card: las propias del producto (solo activas) o, si es null, las globales.
 * Descarta sellos que mencionen transferencia (datos viejos): ese texto lo arma la card desde transferPrice.
 */
export const resolveCardOptions = (
  own: ProductCardOptionsValue | undefined,
  globals: ProductCardOption[],
): Pick<ProductCardOption, 'label' | 'icon'>[] => {
  const options = own == null
    ? globals
    : own
      .filter((option) => option.isActive)
      .map(({ label, icon }) => ({ label, icon: icon || DEFAULT_CARD_OPTION_ICON }));
  return options.filter((option) => !mentionsTransfer(option.label));
};
