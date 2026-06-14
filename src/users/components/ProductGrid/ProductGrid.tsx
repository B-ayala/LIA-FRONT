import React from 'react';
import type { Product } from '../../../types/product';
import ProductCard from '../ProductCard/ProductCard';
import './ProductGrid.css';

interface ProductGridProps {
  products: Product[];
  onReadMore?: (product: Product) => void;
  limit?: number;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onReadMore, limit }) => {
  const displayedProducts = limit ? products.slice(0, limit) : products;

  return (
    <div className="product-grid">
      {displayedProducts.map((product) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          onReadMore={onReadMore}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
