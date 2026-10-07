import { useMemo, useState, type KeyboardEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check, EyeOff, Info, LayoutGrid, Loader2, Monitor, Pencil, TriangleAlert } from 'lucide-react';
import { createProduct, mapDbRowToProduct, updateProduct } from '../../../services/productService';
import ProductGrid from '../../../users/components/ProductGrid/ProductGrid';
import ProductDetailView from '../../../users/pages/producDetail/ProductDetailView';
import type { ProductDraft, ProductPreviewState } from '../../components/ProductModal/productDraft';
import { getAuthToken } from '../../../utils/auth';
import { extractErrorMessage } from '../../../utils/errorMessage';
import { useTypography } from '../../../utils/TypographyProvider';
import '../../../users/pages/producDetail/ProductDetail.css';
import './ProductPreview.css';

type PreviewView = 'card' | 'detail';

const PREVIEW_PRODUCT_ID = 'preview';

const VIEWS: { id: PreviewView; label: string; hint: string; Icon: typeof LayoutGrid }[] = [
  { id: 'card', label: 'Vista Card', hint: 'Cómo aparece en los listados', Icon: LayoutGrid },
  { id: 'detail', label: 'Vista Detalle', hint: 'Cómo aparece al ingresar al producto', Icon: Monitor },
];

// Mismo mapeo que la tienda (mapDbRowToProduct) para que el borrador se sanee y
// se calcule igual que un producto ya guardado.
const draftToProduct = (draft: ProductDraft, productId: string | null) =>
  mapDbRowToProduct({
    id: productId ?? PREVIEW_PRODUCT_ID,
    name: draft.name,
    price: draft.price,
    // Sin original_price a propósito: el backend solo persiste price + discount, así que
    // la tienda calculará el precio con esos dos y la vista previa debe mostrar lo mismo.
    image_url: draft.imageUrl,
    images: draft.images,
    description: draft.description,
    category: draft.category,
    discount: draft.discount,
    stock: draft.stock,
    condition: draft.condition,
    free_shipping: draft.freeShipping,
    hover_image_enabled: draft.hoverImageEnabled,
    variants: draft.variants,
    specifications: draft.specifications,
    features: draft.features,
    faqs: draft.faqs,
    warranty: draft.warranty,
    return_policy: draft.returnPolicy,
    size_guide: draft.sizeGuide,
  });

const ProductPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userLayoutStyle } = useTypography();
  const previewState = location.state as ProductPreviewState | null;
  const [view, setView] = useState<PreviewView>('card');
  const [confirming, setConfirming] = useState(false);
  const [saveError, setSaveError] = useState('');

  const product = useMemo(
    () => (previewState ? draftToProduct(previewState.draft, previewState.productId) : null),
    [previewState],
  );

  // Sin borrador (acceso directo a la URL) no hay nada que previsualizar.
  if (!previewState || !product) return <Navigate to="/admin/products" replace />;

  const { draft, productId } = previewState;

  const goToEdit = () => navigate('/admin/products', { state: { editPreview: previewState } });

  // Patrón WAI-ARIA de tabs: flechas mueven la selección y el foco.
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next: PreviewView = view === 'card' ? 'detail' : 'card';
    setView(next);
    document.getElementById(`preview-tab-${next}`)?.focus();
  };

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    setSaveError('');
    try {
      const token = await getAuthToken();
      if (productId) {
        await updateProduct(productId, draft, token);
      } else {
        await createProduct(draft, token);
      }
      navigate('/admin/products', { replace: true });
    } catch (err) {
      setSaveError(extractErrorMessage(err, 'No se pudo guardar el producto'));
      setConfirming(false);
    }
  };

  return (
    <div className="product-preview">
      <header className="product-preview__header">
        <div className="product-preview__heading">
          <nav className="product-preview__breadcrumb" aria-label="Ruta de navegación">
            <span>Productos</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Vista previa</span>
          </nav>
          <h1 className="admin-page-title">Vista previa del producto</h1>
          <p className="admin-page-subtitle">{product.name}</p>
        </div>
        <div className="product-preview__actions">
          <button type="button" className="admin-btn-secondary admin-flex-center gap-2" onClick={goToEdit} disabled={confirming}>
            <Pencil size={16} aria-hidden="true" /> Editar producto
          </button>
          <button type="button" className="admin-btn-primary admin-flex-center gap-2" onClick={handleConfirm} disabled={confirming}>
            {confirming
              ? <><Loader2 size={16} className="product-preview__spinner" aria-hidden="true" /> Guardando…</>
              : <><Check size={16} aria-hidden="true" /> Confirmar</>}
          </button>
        </div>
      </header>

      <div className="product-preview__notes">
        <p className="product-preview__note">
          <Info size={16} aria-hidden="true" />
          Así lo verán tus clientes en la tienda. Todavía no se guardó: los cambios se aplican recién al confirmar.
        </p>
        {saveError && (
          <p className="product-preview__note product-preview__note--error" role="alert">
            <TriangleAlert size={16} aria-hidden="true" />
            {saveError.replace(/\.$/, '')}. Podés reintentar con Confirmar o volver a editar.
          </p>
        )}
        {draft.status === 'inactive' && (
          <p className="product-preview__note product-preview__note--warning" role="status">
            <EyeOff size={16} aria-hidden="true" />
            Este producto quedará <strong>Inactivo</strong>: no se mostrará en la tienda.
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
            tabIndex={view === viewId ? 0 : -1}
            onClick={() => setView(viewId)}
            onKeyDown={handleTabKeyDown}
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
