import { useState, useEffect } from 'react';
import { fetchProducts, deleteProduct } from '../../../services/productService';
import { getAuthToken } from '../../../utils/auth';
import './ProductGallery.css';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  public_id: string;
  stock: number;
  status: string;
  category: string;
}

interface ProductGalleryProps {
  onProductSelect?: (product: Product) => void;
  refreshTrigger?: number;
}

const ProductGallery = ({ onProductSelect, refreshTrigger }: ProductGalleryProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, [refreshTrigger]);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error('Load products error:', err);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar ${product.name}?`)) {
      return;
    }

    setDeleting(product.id);
    setError('');

    try {
      const token = await getAuthToken().catch(() => '');
      if (!token) throw new Error('Usuario no autenticado');

      // Call backend to delete product and image
      await deleteProduct(product.id, token);

      // Remove from local state
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el producto');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="product-gallery"><p>Cargando productos...</p></div>;
  }

  return (
    <div className="product-gallery">
      {error && <div className="gallery-error">{error}</div>}

      {products.length === 0 ? (
        <div className="gallery-empty">
          <p>No hay productos. Crea el primero.</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {products.map((product) => (
            <div
              key={product.id}
              className="gallery-item"
              onClick={() => onProductSelect?.(product)}
            >
              {product.image_url && (
                <div className="item-image">
                  <img src={product.image_url} alt={product.name} />
                  <div className="item-overlay">
                    <button className="item-edit-btn">Editar</button>
                  </div>
                </div>
              )}

              <div className="item-info">
                <h4>{product.name}</h4>
                <p className="item-category">{product.category || 'Sin categoría'}</p>
                <p className="item-price">${product.price.toFixed(2)}</p>
                <p className="item-stock">Stock: {product.stock}</p>
                <span className={`item-status ${product.status}`}>
                  {product.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="item-actions">
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(product);
                  }}
                  disabled={deleting === product.id}
                >
                  {deleting === product.id ? '🗑️ Eliminando...' : '🗑️ Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
