type PriceLike = {
  price: number;
  discount?: number;
  originalPrice?: number;
};

export type ProductPricing = {
  finalPrice: number;
  originalPrice?: number;
  discountPercentage?: number;
  hasPromotion: boolean;
};

const CENTS_FACTOR = 100;

/** Redondeo a centavos: evita totales como 8499.150000000001 al aplicar descuentos o multiplicar. */
export const roundToCents = (value: number): number =>
  Math.round((value + Number.EPSILON) * CENTS_FACTOR) / CENTS_FACTOR;

/** IVA general de Argentina. Los precios del catálogo se cargan con IVA incluido. */
export const VAT_RATE = 0.21;

/** Neto (sin IVA) de un precio final. Devuelve undefined si el precio no es válido. */
export const getPriceWithoutTax = (finalPrice: number): number | undefined => {
  if (!Number.isFinite(finalPrice) || finalPrice <= 0) return undefined;
  return roundToCents(finalPrice / (1 + VAT_RATE));
};

const roundDiscount =(value: number) => roundToCents(value);

export const calculateDiscountPercentage = (originalPrice: number, finalPrice: number) => {
  if (!Number.isFinite(originalPrice) || !Number.isFinite(finalPrice) || originalPrice <= 0 || finalPrice >= originalPrice) {
    return undefined;
  }

  return roundDiscount(((originalPrice - finalPrice) / originalPrice) * 100);
};

export const getProductPricing = ({ price, discount, originalPrice }: PriceLike): ProductPricing => {
  const safePrice = Number(price) || 0;
  const safeOriginalPrice = Number(originalPrice);

  if (Number.isFinite(safeOriginalPrice) && safeOriginalPrice > safePrice) {
    return {
      finalPrice: safePrice,
      originalPrice: safeOriginalPrice,
      discountPercentage: calculateDiscountPercentage(safeOriginalPrice, safePrice),
      hasPromotion: true,
    };
  }

  const safeDiscount = Number(discount);
  if (Number.isFinite(safeDiscount) && safeDiscount > 0) {
    return {
      finalPrice: roundToCents(safePrice * (1 - safeDiscount / 100)),
      originalPrice: safePrice,
      discountPercentage: safeDiscount,
      hasPromotion: true,
    };
  }

  return {
    finalPrice: safePrice,
    hasPromotion: false,
  };
};