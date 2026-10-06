import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, EyeOff, Info, LayoutGrid, Monitor, PackageX, Pencil } from 'lucide-react';
import { fetchProductById, mapDbRowToProduct } from '../../../services/productService';
import type { Product } from '../../../types/product';
import ProductGrid from '../../../users/components/ProductGrid/ProductGrid';
import ProductDetailView from '../../../users/pages/producDetail/ProductDetailView';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import { useTypography } from '../../../utils/TypographyProvider';
import { withTimeout } from '../../../utils/withTimeout';
import '../../../users/pages/producDetail/ProductDetail.css';
import './ProductPreview.css';

type PreviewView = 'card' | 'detail';
type LoadState = 'loading' | 'error' | 'ready';

const VIEWS: { id: PreviewView; label: string; hint: string; Icon: typeof LayoutGrid }[] = [
  { id: 'card', label: 'Vista Card', hint: 'Cómo aparece en los listados', Icon: LayoutGrid },
  { id: 'detail', label: 'Vista Detalle', hint: 'Cómo aparece al ingresar al producto', Icon: Monitor },
];

const ProductPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userLayoutStyle } = useTypography();
  const [view, setView] = useState<PreviewView>('card');
  const [product, setProduct] = useState<Product | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Se lee de la base (no del store) para mostrar exactamente lo que quedó
    // guardado; activeOnly=false porque el admin puede previsualizar inactivos.
    withTimeout(fetchProductById(id!, false))
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setProduct(null);
          setLoadState('error');
          return;
        }
        setProduct(mapDbRowToProduct(row));
        setIsActive(row.status !== 'inactive');
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const retry = () => {
    setLoadState('loading');
    setAttempt((n) => n + 1);
  };
  const goToProducts = () => navigate('/admin/products');
  const goToEdit = () => navigate('/admin/products', { state: { editProductId: id } });

  if (loadState === 'loading') {
    return (
      <div className="product-preview__status" role="status" aria-busy="true">
        <LiaLoader size="md" />
        <p>Cargando vista previa…</p>
      </div>
    );
  }

  if (loadState === 'error' || !product) {
    return (
      <div className="product-preview__status" role="alert">
        <PackageX size={44} aria-hidden="true" />
        <h2>No pudimos cargar la vista previa</h2>
        <p>El producto no existe o hubo un problema de conexión. Tu producto ya está guardado.</p>
        <div className="product-preview__status-actions">
          <button type="button" className="admin-btn-secondary" onClick={retry}>
            Reintentar
          </button>
          <button type="button" className="admin-btn-primary" onClick={goToProducts}>
            Volver a productos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-preview">
      <header className="product-preview__header">
        <div className="product-preview__heading">
          <nav className="product-preview__breadcrumb" aria-label="Ruta de navegación">
            <button type="button" onClick={goToProducts}>Productos</button>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Vista previa</span>
          </nav>
          <h1 className="admin-page-title">Vista previa del producto</h1>
          <p className="admin-page-subtitle">{product.name}</p>
        </div>
        <div className="product-preview__actions">
          <button type="button" className="admin-btn-secondary admin-flex-center gap-2" onClick={goToEdit}>
            <Pencil size={16} aria-hidden="true" /> Editar producto
          </button>
          <button type="button" className="admin-btn-primary admin-flex-center gap-2" onClick={goToProducts}>
            <Check size={16} aria-hidden="true" /> Listo
          </button>
        </div>
      </header>

      <div className="product-preview__notes">
        <p className="product-preview__note">
          <Info size={16} aria-hidden="true" />
          Así lo verán tus clientes en la tienda. Es una vista previa: los botones de compra no realizan acciones.
        </p>
        {!isActive && (
          <p className="product-preview__note product-preview__note--warning" role="status">
            <EyeOff size={16} aria-hidden="true" />
            Este producto está <strong>Inactivo</strong>: todavía no se muestra en la tienda.
          </p>
        )}
      </div>

      <div className="product-preview__tabs" role="tablist" aria-label="Tipo de vista previa">
        {VIEWS.map(({ id: viewId, label, hint, Icon }) => (
          <button
            key={viewId}
            type="button"
            role="tab"
            id={`preview-tab-${viewId}`}
            aria-selected={view === viewId}
            aria-controls="preview-panel"
            className={`product-preview__tab${view === viewId ? ' product-preview__tab--active' : ''}`}
            onClick={() => setView(viewId)}
          >
            <Icon size={18} aria-hidden="true" />
            <span className="product-preview__tab-text">
              <span className="product-preview__tab-label">{label}</span>
              <span className="product-preview__tab-hint">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      <section
        id="preview-panel"
        role="tabpanel"
        aria-labelledby={`preview-tab-${view}`}
        className={`product-preview__stage product-preview__stage--${view}`}
        style={userLayoutStyle}
      >
        {view === 'card' ? (
          <div className="product-preview__card-slot">
            <ProductGrid products={[product]} onReadMore={() => setView('detail')} />
          </div>
        ) : (
          <ProductDetailView key={product.id} product={product} preview />
        )}
      </section>
    </div>
  );
};

export default ProductPreview;
