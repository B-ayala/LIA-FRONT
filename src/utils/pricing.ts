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

const roundDiscount = (value: number) => Math.round(value * 100) / 100;

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
      finalPrice: safePrice * (1 - safeDiscount / 100),
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