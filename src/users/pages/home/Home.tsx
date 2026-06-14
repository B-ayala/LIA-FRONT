import { useEffect, useState } from 'react';
import Carousel from '../../components/header/Carousel';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import SEO from '../../../components/common/SEO/SEO';
import { fetchFeaturedProducts, mapDbRowToProduct } from '../../../services/productService';
import type { Product } from '../../../types/product';
import { useInitialLoadTask } from '../../../components/common/InitialLoad/InitialLoadProvider';
import './Home.css';

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);

  useInitialLoadTask('route', isFeaturedLoading);

  useEffect(() => {
    fetchFeaturedProducts()
      .then((rows) => setProducts(rows.map(mapDbRowToProduct).filter((p) => (p.stock ?? 0) > 0)))
      .catch(console.error)
      .finally(() => setIsFeaturedLoading(false));
  }, []);

  return (
    <div className="home">
      <SEO
        title="Inicio"
        description="Tienda online de moda femenina LIA by Damiana Bella. Descubrí ropa, accesorios y las últimas tendencias con envío a todo el país."
        path="/"
      />
      <h1 className="sr-only">LIA — Tienda de Moda Femenina</h1>
      <Carousel />

      <section className="home__featured-products">
        <div className="home__container">
          <h2 className="home__section-title">Productos Destacados</h2>
          <ProductGrid
            products={products}
            limit={10}
          />
        </div>
      </section>
    </div>
  );
};

export default Home;
