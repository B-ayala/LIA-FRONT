import React, { useEffect, useState } from 'react';
import type { Product } from '../../../types/product';
import type { ProductCardOption } from '../../../types/productCardOption';
import { fetchProductCardOptions } from '../../../services/productService';
import ProductCard from '../ProductCard/ProductCard';
import './ProductGrid.css';

interface ProductGridProps {
  products: Product[];
  onReadMore?: (product: Product) => void;
  limit?: number;
  loading?: boolean;
  skeletonCount?: number;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onReadMore,
  limit,
  loading = false,
  skeletonCount = 6,
}) => {
  const [cardOptions, setCardOptions] = useState<ProductCardOption[]>([]);

  useEffect(() => {
    fetchProductCardOptions()
      .then(setCardOptions)
      .catch(() => setCardOptions([]));
  }, []);

  if (loading) {
    return (
      <div className="product-grid" aria-busy="true" aria-label="Cargando productos">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div className="product-card-skeleton" key={i} aria-hidden="true">
            <div className="product-card-skeleton__img skeleton" />
            <div className="product-card-skeleton__line product-card-skeleton__line--title skeleton" />
            <div className="product-card-skeleton__line product-card-skeleton__line--price skeleton" />
            <div className="product-card-skeleton__btn skeleton" />
          </div>
        ))}
      </div>
    );
  }

  const displayedProducts = limit ? products.slice(0, limit) : products;

  return (
    <div className="product-grid">
      {displayedProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onReadMore={onReadMore}
          cardOptions={cardOptions}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
