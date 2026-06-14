import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../../types/product';
import { parseColorOption } from '../../../utils/constants';
import { getProductPricing } from '../../../utils/pricing';
import { buildCloudinaryUrl } from '../../../utils/cloudinary';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  onReadMore?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onReadMore }) => {
  const navigate = useNavigate();

  const handleReadMore = () => {
    if (onReadMore) {
      onReadMore(product);
    } else {
      navigate(`/product/${product.id}`);
    }
  };

  const colorVariant = product.variants?.find(v => v.name.toLowerCase() === 'color');
  const pricing = getProductPricing(product);

  return (
    <div className="product-card">
      <div className="product-card__image-container" onClick={handleReadMore}>
        {pricing.hasPromotion && pricing.discountPercentage && (
          <div className="product-card__discount-badge">-{pricing.discountPercentage}%</div>
        )}
        <img
          src={buildCloudinaryUrl(product.image, {
            width: 400,
            quality: 'auto',
            format: 'auto'
          })}
          alt={product.name}
          className="product-card__image"
          loading="lazy"
          decoding="async"
          width={400}
          height={667}
        />
      </div>
      
      <div className="product-card__content">
        <h3 className="product-card__name">{product.name}</h3>

        <div className="product-card__pricing">
          {pricing.hasPromotion && pricing.originalPrice && pricing.discountPercentage && (
            <div className="product-card__pricing-top">
              <span className="product-card__original-price">
                ${pricing.originalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="product-card__off-label">{pricing.discountPercentage}% OFF</span>
            </div>
          )}

          <p className="product-card__price">
            ${pricing.finalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        
        {colorVariant && colorVariant.options && (
          <div className="product-card__colors">
            {colorVariant.options.map((color, index) => {
              const { name, hex } = parseColorOption(color);
              return (
                <span
                  key={index}
                  className="product-card__color-circle"
                  style={{ backgroundColor: hex }}
                  title={name}
                />
              );
            })}
          </div>
        )}

        <div className="product-card__actions">
          <button
            className="product-card__button"
            onClick={handleReadMore}
          >
            Leer más
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
