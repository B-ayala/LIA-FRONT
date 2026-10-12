import type { ComponentProps } from 'react';
import MuiThemeScope from '../../../../components/common/MuiTheme/MuiThemeScope';
import { useState, useEffect, useRef } from 'react';
import { Collapse, Divider } from '@mui/material';
import { FiPackage, FiChevronDown, FiChevronUp, FiShoppingBag, FiArrowLeft } from 'react-icons/fi';
import Modal from '../../../../components/common/Modal/Modal';
import LiaLoader from '../../../../components/common/LiaLoader/LiaLoader';
import { getUserPurchases, type Purchase } from '../../../../services/orderService';
import { fetchProductById, mapDbRowToProduct } from '../../../../services/productService';
import type { Product } from '../../../../types/product';
import { buildCloudinaryUrl } from '../../../../utils/cloudinary';
import { formatDate, formatPrice } from '../../../../utils/formatters';
import { getProductPricing } from '../../../../utils/pricing';
import DispatchTracker from './DispatchTracker';
import { PAYMENT_METHOD_LABEL, SHIPPING_METHOD_LABEL } from '../../../../utils/labels';

const REFRESH_INTERVAL_MS = 20_000;
const REFRESH_TIMEOUT_MS = 15_000;

interface MyPurchasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

const badgeStyle = {
  fontSize: '0.78rem',
  padding: '0.2rem 0.6rem',
  borderRadius: '20px',
  background: 'rgba(184,165,200,0.15)',
  color: 'var(--text-dark)',
} as const;

const PurchaseItemContent = ({ purchase }: { purchase: Purchase }) => (
  <>
    {purchase.product_image ? (
      <img
        src={buildCloudinaryUrl(purchase.product_image, { width: 72, quality: 'auto', format: 'auto' })}
        alt={purchase.product_name}
        width={72}
        height={72}
        style={{ borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    ) : (
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '8px',
          background: 'rgba(184,165,200,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <FiPackage size={28} color="var(--primary-accent)" />
      </div>
    )}

    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          margin: '0 0 0.25rem',
          fontWeight: 600,
          fontSize: '0.95rem',
          color: 'var(--text-dark)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {purchase.product_name}
      </p>
      <p style={{ margin: '0 0 0.25rem', fontSize: '0.82rem', color: '#888' }}>
        {formatDate(purchase.created_at)}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
        <span style={badgeStyle}>
          {purchase.quantity} {purchase.quantity === 1 ? 'unidad' : 'unidades'}
        </span>
        {purchase.shipping_method && (
          <span style={badgeStyle}>
            {SHIPPING_METHOD_LABEL[purchase.shipping_method] ?? purchase.shipping_method}
          </span>
        )}
        <span style={badgeStyle}>
          {PAYMENT_METHOD_LABEL[purchase.payment_method] ?? purchase.payment_method}
        </span>
      </div>
    </div>

    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <p style={{ margin: '0 0 0.15rem', fontSize: '0.8rem', color: '#888' }}>
        {formatPrice(purchase.unit_price)} c/u
      </p>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--primary-accent)' }}>
        {formatPrice(purchase.total_price)}
      </p>
    </div>
  </>
);

const PurchaseProductDetail = ({
  purchase,
  product,
  loading,
  onBack,
}: {
  purchase: Purchase;
  product: Product | null;
  loading: boolean;
  onBack: () => void;
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product?.images || (product?.image ? [product.image] : []);
  const pricing = product ? getProductPricing(product) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--primary-accent)',
          fontWeight: 500,
          fontSize: '0.9rem',
          padding: '0.25rem 0',
          fontFamily: 'inherit',
        }}
      >
        <FiArrowLeft size={16} />
        Volver a mis compras
      </button>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <LiaLoader size="md" />
        </div>
      ) : (
        <>
          {/* Image gallery */}
          {images.length > 0 && (
            <div style={{ position: 'relative' }}>
              <img
                src={images[currentImageIndex]}
                alt={product?.name ?? purchase.product_name}
                style={{
                  width: '100%',
                  maxHeight: '340px',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  background: '#fafafa',
                }}
              />
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
                  {images.map((img, idx) => (
                    <img
                      key={idx}
                      src={buildCloudinaryUrl(img, { width: 56, quality: 'auto', format: 'auto' })}
                      alt={`${product?.name ?? purchase.product_name} ${idx + 1}`}
                      onClick={() => setCurrentImageIndex(idx)}
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: 'cover',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: idx === currentImageIndex ? '2px solid var(--primary-accent)' : '2px solid transparent',
                        opacity: idx === currentImageIndex ? 1 : 0.6,
                        transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </div>
              )}
              {pricing?.hasPromotion && pricing.discountPercentage && (
                <span
                  style={{
                    position: 'absolute',
                    top: '0.75rem',
                    left: '0.75rem',
                    background: 'var(--primary-accent)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.6rem',
                    borderRadius: '8px',
                  }}
                >
                  -{pricing.discountPercentage}%
                </span>
              )}
            </div>
          )}

          {/* Product info */}
          <div>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem', color: 'var(--text-dark)' }}>
              {product?.name ?? purchase.product_name}
            </h3>
            {product?.category && (
              <span style={{ fontSize: '0.82rem', color: '#999' }}>{product.category}</span>
            )}
          </div>

          {/* Price */}
          {pricing && (
            <div>
              {pricing.hasPromotion && pricing.originalPrice && (
                <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '0.9rem', marginRight: '0.5rem' }}>
                  {formatPrice(pricing.originalPrice)}
                </span>
              )}
              <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary-accent)' }}>
                {formatPrice(pricing.finalPrice)}
              </span>
            </div>
          )}

          {/* Purchase info */}
          <div
            style={{
              background: 'rgba(184,165,200,0.08)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>
              Tu compra
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.83rem', color: '#666' }}>
              <span>{purchase.quantity} {purchase.quantity === 1 ? 'unidad' : 'unidades'}</span>
              <span>·</span>
              <span>{formatPrice(purchase.unit_price)} c/u</span>
              <span>·</span>
              <span style={{ fontWeight: 600, color: 'var(--primary-accent)' }}>Total: {formatPrice(purchase.total_price)}</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#999' }}>{formatDate(purchase.created_at)}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem' }}>
              <span style={badgeStyle}>
                {PAYMENT_METHOD_LABEL[purchase.payment_method] ?? purchase.payment_method}
              </span>
              {purchase.shipping_method && (
                <span style={badgeStyle}>
                  {SHIPPING_METHOD_LABEL[purchase.shipping_method] ?? purchase.shipping_method}
                </span>
              )}
            </div>
            {purchase.units_config && purchase.units_config.length > 0 && (
              <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {purchase.units_config.map((unit, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-dark)' }}>
                    <span style={{ color: '#888', minWidth: '4rem' }}>Ud. {idx + 1}:</span>
                    {Object.entries(unit).map(([key, val]) => (
                      <span key={key}>
                        <span style={{ textTransform: 'capitalize', color: '#888' }}>{key}:</span>{' '}
                        <strong>{val}</strong>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid rgba(184,165,200,0.25)', borderRadius: '12px' }}>
            <DispatchTracker status={purchase.dispatch_status} shippingMethod={purchase.shipping_method} />
          </div>

          {/* Description */}
          {product?.description && (
            <div>
              <p style={{ margin: '0 0 0.3rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                Descripción
              </p>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#666', lineHeight: 1.6 }}>
                {product.description}
              </p>
            </div>
          )}

          {/* Features */}
          {product?.features && product.features.length > 0 && (
            <div>
              <p style={{ margin: '0 0 0.3rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                Características
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#666', lineHeight: 1.8 }}>
                {product.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Specifications */}
          {product?.specifications && product.specifications.length > 0 && (
            <div>
              <p style={{ margin: '0 0 0.3rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                Especificaciones
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {product.specifications.map((spec, i) => (
                  <div key={i} style={{ display: 'flex', fontSize: '0.84rem' }}>
                    <span style={{ color: '#888', minWidth: '120px' }}>{spec.label}</span>
                    <span style={{ color: 'var(--text-dark)' }}>{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PurchaseItem = ({ purchase, onOpenProduct }: { purchase: Purchase; onOpenProduct: (purchase: Purchase) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const hasVariants = purchase.units_config && purchase.units_config.length > 0;
  const canOpenProduct = purchase.product_id !== null && String(purchase.product_id).trim() !== '';
  const headerStyles = {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    alignItems: 'flex-start',
  } as const;

  return (
    <div
      style={{
        border: '1px solid rgba(184,165,200,0.25)',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'rgba(184,165,200,0.04)',
      }}
    >
      {canOpenProduct ? (
        <button
          type="button"
          onClick={() => onOpenProduct(purchase)}
          style={{
            ...headerStyles,
            width: '100%',
            border: 'none',
            background: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          aria-label={`Ver detalle de ${purchase.product_name}`}
        >
          <PurchaseItemContent purchase={purchase} />
        </button>
      ) : (
        <div style={headerStyles}>
          <PurchaseItemContent purchase={purchase} />
        </div>
      )}

      <Divider sx={{ borderColor: 'rgba(184,165,200,0.2)' }} />
      <DispatchTracker status={purchase.dispatch_status} shippingMethod={purchase.shipping_method} />

      {/* Expand button for variants */}
      {hasVariants && (
        <>
          <Divider sx={{ borderColor: 'rgba(184,165,200,0.2)' }} />
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '0.6rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: 'var(--primary-accent)',
              fontWeight: 500,
              fontFamily: 'inherit',
            }}
          >
            <span>{expanded ? 'Ocultar detalle de variantes' : 'Ver detalle de variantes'}</span>
            {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>

          <Collapse in={expanded}>
            <div style={{ padding: '0 1rem 1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {purchase.units_config!.map((unit, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      fontSize: '0.83rem',
                      color: 'var(--text-dark)',
                    }}
                  >
                    <span style={{ color: '#888', minWidth: '4rem' }}>Ud. {idx + 1}:</span>
                    {Object.entries(unit).map(([key, val]) => (
                      <span key={key}>
                        <span style={{ textTransform: 'capitalize', color: '#888' }}>{key}:</span>{' '}
                        <strong>{val}</strong>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Collapse>
        </>
      )}
    </div>
  );
};

const MyPurchasesModalContent = ({ isOpen, onClose, email }: MyPurchasesModalProps) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Cada apertura de detalle invalida la anterior: una respuesta lenta no puede pisar otra compra.
  const detailRequestId = useRef(0);

  const openPurchasedProduct = (purchase: Purchase) => {
    const requestId = ++detailRequestId.current;
    const isStale = () => requestId !== detailRequestId.current;
    setSelectedPurchase(purchase);
    setDetailLoading(true);
    setDetailProduct(null);
    fetchProductById(String(purchase.product_id), false)
      // row null = producto borrado: el detalle muestra solo los datos de la compra.
      .then((row) => { if (!isStale()) setDetailProduct(row ? mapDbRowToProduct(row) : null); })
      .catch(() => {/* error real de red: el detalle muestra solo los datos de la compra */})
      .finally(() => { if (!isStale()) setDetailLoading(false); });
  };

  const handleBack = () => {
    detailRequestId.current++;
    setSelectedPurchase(null);
    setDetailProduct(null);
  };

  const handleClose = () => {
    detailRequestId.current++;
    onClose();
    setSelectedPurchase(null);
    setDetailProduct(null);
  };

  useEffect(() => {
    if (!isOpen || !email) return;
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelectedPurchase(null);
    setDetailProduct(null);
    getUserPurchases(email, controller.signal)
      .then((data) => { if (!cancelled) setPurchases(data); })
      .catch(() => { if (!cancelled) setError('No se pudieron cargar tus compras. Intentá más tarde.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen, email]);

  // Refresco silencioso (sin loader) para que el usuario vea los cambios de despacho del admin
  // sin cerrar y reabrir el modal. Se pausa con la pestaña oculta y no solapa requests.
  useEffect(() => {
    if (!isOpen || !email) return;
    let cancelled = false;
    let inFlight = false;
    let controller: AbortController | null = null;

    const refresh = () => {
      if (document.hidden || inFlight) return;
      inFlight = true;
      const requestController = new AbortController();
      controller = requestController;
      // Sin timeout, un request colgado dejaría inFlight en true y frenaría el polling.
      const timeoutId = window.setTimeout(() => requestController.abort(), REFRESH_TIMEOUT_MS);
      getUserPurchases(email, requestController.signal)
        .then((fresh) => {
          if (cancelled) return;
          setPurchases(fresh);
          setError(null);
          setSelectedPurchase((current) => current && (fresh.find((p) => p.id === current.id) ?? current));
        })
        // Un fallo puntual no debe pisar lo ya mostrado: se reintenta en el próximo ciclo.
        .catch(() => undefined)
        .finally(() => {
          window.clearTimeout(timeoutId);
          inFlight = false;
        });
    };

    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [isOpen, email]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={selectedPurchase ? 'Detalle de compra' : 'Mis compras'}>
      <div style={{ paddingTop: '0.5rem' }}>
        {selectedPurchase ? (
          <PurchaseProductDetail
            purchase={selectedPurchase}
            product={detailProduct}
            loading={detailLoading}
            onBack={handleBack}
          />
        ) : (
          <>
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <LiaLoader size="md" />
              </div>
            )}

            {!loading && error && (
              <p style={{ textAlign: 'center', color: '#c0392b', padding: '1rem 0' }}>{error}</p>
            )}

            {!loading && !error && purchases.length === 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '2.5rem 1rem',
                  color: '#999',
                }}
              >
                <FiShoppingBag size={48} style={{ opacity: 0.35 }} />
                <p style={{ margin: 0, fontSize: '1rem', textAlign: 'center' }}>
                  Aún no realizaste compras.
                </p>
              </div>
            )}

            {!loading && !error && purchases.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#999' }}>
                  {purchases.length} {purchases.length === 1 ? 'compra realizada' : 'compras realizadas'}
                </p>
                {purchases.map((p) => (
                  <PurchaseItem key={p.id} purchase={p} onOpenProduct={openPurchasedProduct} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

// Monta el theme de MUI en su propio chunk (ver MuiThemeScope): este
// componente solo se carga con lazy(), asi MUI no entra al bundle critico.
const MyPurchasesModal = (props: ComponentProps<typeof MyPurchasesModalContent>) => (
  <MuiThemeScope>
    <MyPurchasesModalContent {...props} />
  </MuiThemeScope>
);

export default MyPurchasesModal;
