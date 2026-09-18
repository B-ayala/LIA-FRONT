import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../../types/product';
import type { ProductCardOption } from '../../../types/productCardOption';
import { getProductPricing } from '../../../utils/pricing';
import { productImageSrc } from '../../../utils/cloudinary';
import { getCardOptionIcon } from '../../../utils/cardOptionIcons';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  onReadMore?: (product: Product) => void;
  cardOptions?: ProductCardOption[];
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onReadMore, cardOptions = [] }) => {
  const navigate = useNavigate();

  const handleReadMore = () => {
    if (onReadMore) {
      onReadMore(product);
    } else {
      navigate(`/product/${product.id}`);
    }
  };

  const pricing = getProductPricing(product);
  const isOutOfStock = (product.stock ?? 0) <= 0;

  return (
    <div className={`product-card${isOutOfStock ? ' product-card--out-of-stock' : ''}`}>
      <div className="product-card__image-container" onClick={handleReadMore}>
        {isOutOfStock ? (
          <div className="product-card__stock-badge">Sin stock</div>
        ) : pricing.hasPromotion && pricing.discountPercentage && (
          <div className="product-card__discount-badge">-{pricing.discountPercentage}%</div>
        )}
        <img
          src={productImageSrc(product.image, {
            width: 400,
            quality: 'auto',
            format: 'auto'
          })}
          srcSet={[400, 800, 1200]
            .map(w => `${productImageSrc(product.image, { width: w, quality: 'auto', format: 'auto' })} ${w}w`)
            .join(', ')}
          sizes="(min-width: 768px) 260px, 45vw"
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
        
        {cardOptions.length > 0 && (
          <ul className="product-card__badges">
            {cardOptions.map((option) => {
              const Icon = getCardOptionIcon(option.icon);
              return (
                <li key={option.id} className="product-card__badge" title={option.label}>
                  <Icon size={13} className="product-card__badge-icon" aria-hidden="true" />
                  <span className="product-card__badge-label">{option.label}</span>
                </li>
              );
            })}
          </ul>
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
