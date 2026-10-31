import type { ProductCardOptionsValue } from './productCardOption';

export interface Variant {
  name: string;
  options: string[];
  stockByOption?: Record<string, number>;
  colorsByOption?: Record<string, string[]>;
}

export type SizeGuideType = 'indumentaria' | 'calzado';

export interface SizeGuideRow {
  label: string;
  values: Record<string, string>;
}

export interface SizeGuide {
  type?: SizeGuideType;
  columns?: string[];
  rows: SizeGuideRow[];
  /**
   * Origen de las columnas (clave = nombre en MAYÚSCULAS). Presente ⇒ talle global del catálogo;
   * ausente ⇒ talle propio de este producto. Una guía sin este campo tiene todas las columnas propias.
   */
  columnSources?: Record<string, { sizeId: string }>;
  /** Unidad de los valores de la tabla. Ausente en guías anteriores: se muestra como cm. */
  unit?: SizeGuideUnit;
  /** Si los valores son del cuerpo o de la prenda. Ausente = sin indicar (la tienda no afirma ninguna). */
  measurementBasis?: SizeGuideMeasurementBasis;
  /** Aclaraciones propias de este producto. Ausente = usa las globales (Admin > Talles > Textos de la guía). */
  notes?: string[];
  /** Referencia de calce con datos reales de la modelo. Los campos vacíos no se muestran. */
  fitReference?: SizeGuideFitReference;
}

export type SizeGuideUnit = 'cm' | 'mm';

export type SizeGuideMeasurementBasis = 'body' | 'garment';

export interface SizeGuideFitReference {
  modelHeightCm?: number;
  topSize?: string;
  bottomSize?: string;
  /** Calzas, shorts, bermudas y otras prendas ajustadas. */
  fittedSize?: string;
  /** Calce de la prenda: ajustado, regular, holgado u otra descripción. */
  fit?: string;
  notes?: string;
  /** Debe ser una de las imágenes del producto; si deja de serlo, la tienda no la muestra. */
  image?: string;
}

export interface Specification {
  label: string;
  value: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Review {
  id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string | number;
  name: string;
  price: number;
  originalPrice?: number;
  /** Precio informativo "con transferencia": solo se muestra, el checkout cobra `price`. */
  transferPrice?: number;
  image: string;
  images?: string[];
  description?: string;
  category?: string;
  discount?: number;
  stock?: number;
  condition?: 'new' | 'used';
  freeShipping?: boolean;
  hoverImageEnabled?: boolean;
  /** null/undefined = opciones globales de la card. */
  cardOptions?: ProductCardOptionsValue;
  rating?: number;
  reviewCount?: number;
  variants?: Variant[];
  specifications?: Specification[];
  features?: string[];
  faqs?: FAQ[];
  reviews?: Review[];
  warranty?: string;
  returnPolicy?: string;
  sizeGuide?: SizeGuide;
}
