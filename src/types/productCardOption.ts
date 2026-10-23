export interface ProductCardOption {
  id: string;
  label: string;
  icon: string;
  order: number;
  isActive: boolean;
}

/** Opción de card definida por un producto (sin id: el orden del array es el de display). */
export interface ProductOwnCardOption {
  label: string;
  icon: string;
  isActive: boolean;
}

/** `null` = el producto usa las opciones globales; `[]` = sin sellos. */
export type ProductCardOptionsValue = ProductOwnCardOption[] | null;

export const MAX_PRODUCT_CARD_OPTIONS = 10;
export const MAX_CARD_OPTION_LABEL_LENGTH = 40;
