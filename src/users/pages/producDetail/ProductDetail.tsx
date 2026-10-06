import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PackageX } from 'lucide-react';
import logoImg from '../../../assets/img/logo.jpeg';
import { fetchProductById, mapDbRowToProduct } from '../../../services/productService';
import type { Product } from '../../../types/product';
import SEO from '../../../components/common/SEO/SEO';
import { useInitialLoadTask } from '../../../components/common/InitialLoad/InitialLoadProvider';
import { withTimeout } from '../../../utils/withTimeout';
import ProductDetailView from './ProductDetailView';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  // Tracker del patrón "ajustar estado en render" (reemplaza un effect que
  // reseteaba estado al cambiar id).
  const [loadedId, setLoadedId] = useState(id);

  // Reset al navegar entre productos: limpia el producto anterior antes de
  // que llegue el nuevo (evita mostrar el viejo mientras carga el otro).
  if (id !== loadedId) {
    setLoadedId(id);
    setProduct(null);
    setNotFound(false);
  }

  useInitialLoadTask('route', !notFound && !product);

  useEffect(() => {
    let cancelled = false;

    // withTimeout evita que un fetch colgado (red inestable, request sin
    // respuesta) deje la ficha de producto en skeleton para siempre: pasado
    // el timeout se resuelve con null y cae en el mismo camino de "no
    // disponible" que ya se usa para errores reales.
    withTimeout(fetchProductById(id!))
      .then((row) => {
        if (cancelled) return;
        // Producto inactivo, retirado o inexistente (null): estado "no disponible".
        if (!row) return setNotFound(true);
        // Sin stock (activo) sí se muestra: la propia vista ya indica "Sin stock"
        // y deshabilita la compra.
        setProduct(mapDbRowToProduct(row));
      })
      // Error real (red/servidor): también mostramos "no disponible".
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="product-unavailable">
        <SEO title="Producto no disponible" description="Este producto ya no está disponible en LIA." path={`/product/${id}`} />
        <PackageX size={56} className="product-unavailable__icon" />
        <h2 className="product-unavailable__title">Producto no disponible</h2>
        <p className="product-unavailable__text">
          Este producto ya no está disponible o fue retirado de la tienda.
        </p>
        <button
          type="button"
          className="product-unavailable__btn"
          onClick={() => navigate('/products')}
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-skeleton" role="status" aria-label="Cargando producto" aria-busy="true">
        <div className="product-detail-skeleton__logo-wrap">
          <img src={logoImg} alt="LIA" className="product-detail-skeleton__logo" />
        </div>
        <div className="product-detail-skeleton__main">
          <div className="product-detail-skeleton__gallery">
            <div className="product-detail-skeleton__img skeleton" />
            <div className="product-detail-skeleton__thumbs">
              {[0, 1, 2].map((i) => (
                <div key={i} className="product-detail-skeleton__thumb skeleton" />
              ))}
            </div>
          </div>
          <div className="product-detail-skeleton__info">
            <div className="product-detail-skeleton__line product-detail-skeleton__line--badge skeleton" />
            <div className="product-detail-skeleton__line product-detail-skeleton__line--title skeleton" />
            <div className="product-detail-skeleton__line product-detail-skeleton__line--price skeleton" />
            <div className="product-detail-skeleton__variants">
              <div className="product-detail-skeleton__line product-detail-skeleton__line--label skeleton" />
              <div className="product-detail-skeleton__chips">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="product-detail-skeleton__chip skeleton" />
                ))}
              </div>
            </div>
            <div className="product-detail-skeleton__line product-detail-skeleton__line--qty skeleton" />
            <div className="product-detail-skeleton__actions">
              <div className="product-detail-skeleton__btn skeleton" />
              <div className="product-detail-skeleton__btn skeleton" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ProductDetailView key={product.id} product={product} />;
};

export default ProductDetail;
