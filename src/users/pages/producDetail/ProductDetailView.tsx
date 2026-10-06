import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../../types/product';
import SEO from '../../../components/common/SEO/SEO';
import VariantTable from '../../../components/common/VariantTable/VariantTable';
import PurchaseVariantModal from '../../components/PurchaseVariantModal/PurchaseVariantModal';
import { parseColorOption } from '../../../utils/constants';
import { getProductPricing } from '../../../utils/pricing';
import { INVALID_PRODUCT_PRICE_MESSAGE } from '../../../services/orderService';
import { useCartStore } from '../../../store/cartStore';
import type { UnitVariants } from '../../../store/cartStore';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { useInitialLoadTask } from '../../../components/common/InitialLoad/InitialLoadProvider';
import {
  areUnitVariantSelectionsValid,
  getAvailableQuantityForSelection,
  getInvalidVariantSelections,
  getMissingVariantSelections,
  isVariantOptionAvailable,
  isSizeVariant,
  sanitizeSelectedVariants,
  getSelectionStockLimit,
} from '../../../utils/productVariants';
import './ProductDetail.css';

// Lazy: ProductDetail es eager (entrada SEO directa por link compartido) y este
// Modal arrastra MUI/Emotion. Solo se abre al tocar "Guía de talles", así que su
// chunk no tiene por qué estar en el camino crítico del primer render.
const Modal = lazy(() => import('../../../components/common/Modal/Modal'));

interface ProductDetailViewProps {
  product: Product;
  /** Vista previa del admin: misma UI, pero sin SEO ni efectos de compra reales. */
  preview?: boolean;
}

const ProductDetailView = ({ product, preview = false }: ProductDetailViewProps) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<{ [key: string]: string }>(
    () => sanitizeSelectedVariants(product, {}),
  );
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'faq'>('description');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [variantError, setVariantError] = useState('');
  const [missingVariants, setMissingVariants] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  // `src` de la imagen principal que terminó de cargar (o falló): la "main image"
  // está lista si no hay imagen o si la que se está mostrando ya cargó.
  const [loadedImageSrc, setLoadedImageSrc] = useState('');
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const setItem = useCartStore((s) => s.setItem);

  useBodyScrollLock(isImageModalOpen);

  const images = product.images || (product.image ? [product.image] : []);
  const currentImage = images[currentImageIndex] || '';
  const isMainImageReady = currentImage === '' || loadedImageSrc === currentImage;

  // Id propio (distinto de 'route', que cierra el padre al llegar el producto): si
  // compartieran id, el padre cerraría la tarea antes de que cargue la imagen.
  useInitialLoadTask('route-image', !!currentImage && !isMainImageReady);

  const pricing = getProductPricing(product);
  const discountedPrice = pricing.finalPrice;
  const hasValidPrice = Number.isFinite(discountedPrice) && discountedPrice > 0;

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const stock = product.stock ?? 0;
  const currentCartItem = cartItems.find((item) => item.product.id === product.id);
  const selectionStockLimit = getSelectionStockLimit(product, selectedVariants);
  const remainingCartCapacity = getAvailableQuantityForSelection(
    product,
    selectedVariants,
    currentCartItem?.unitVariants ?? [],
  );
  const quantityStockLimit = Number.isFinite(selectionStockLimit) ? selectionStockLimit : stock;
  const canAddSelectedQuantityToCart = remainingCartCapacity > 0 && quantity <= remainingCartCapacity;

  useEffect(() => {
    if (quantityStockLimit <= 0) {
      setQuantity(1);
      return;
    }

    setQuantity((prev) => Math.min(prev, quantityStockLimit));
  }, [quantityStockLimit]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= quantityStockLimit) {
      setVariantError('');
      setQuantity(newQuantity);
    }
  };

  const handleVariantChange = (variantName: string, option: string) => {
    const variant = product.variants?.find((currentVariant) => currentVariant.name === variantName);

    if (!variant || !isVariantOptionAvailable(variant, option)) {
      return;
    }

    setSelectedVariants((prev) => sanitizeSelectedVariants(product, { ...prev, [variantName]: option }));
  };

  const hasVariants = (product.variants?.length ?? 0) > 0;

  const validateCurrentSelection = (): string | null => {
    const invalid = getInvalidVariantSelections(product, selectedVariants);

    if (invalid.length > 0) {
      setMissingVariants(invalid);
      return invalid.some((variantName) => variantName.toLowerCase().startsWith('talle'))
        ? 'El talle seleccionado no tiene stock disponible. Elegí uno con stock.'
        : `La selección actual de ${invalid.join(', ')} no es válida.`;
    }

    const missing = getMissingVariantSelections(product, selectedVariants);

    if (missing.length > 0) {
      setMissingVariants(missing);
      return `Por favor seleccioná: ${missing.join(', ')}`;
    }

    return null;
  };

  const confirmPurchase = (unitVariants: UnitVariants[]) => {
    if (!hasValidPrice) {
      setVariantError(INVALID_PRODUCT_PRICE_MESSAGE);
      return;
    }

    if (!areUnitVariantSelectionsValid(product, unitVariants)) {
      setVariantError('No se puede continuar con un talle sin stock. Elegí una opción disponible.');
      return;
    }

    setIsVariantModalOpen(false);
    if (preview) return;
    setItem({
      product: product,
      quantity,
      unitVariants,
      unitPrice: discountedPrice,
      totalPrice: discountedPrice * quantity,
      source: 'direct',
    });
    navigate('/checkout');
  };

  const handleAddToCart = () => {
    setVariantError('');
    setMissingVariants([]);

    if (remainingCartCapacity <= 0) {
      setVariantError('Ya agregaste al carrito todas las unidades disponibles de este producto.');
      return;
    }

    if (quantity > remainingCartCapacity) {
      setVariantError(`Solo podés agregar ${remainingCartCapacity} ${remainingCartCapacity === 1 ? 'unidad' : 'unidades'} más de este producto.`);
      return;
    }

    if (!hasValidPrice) {
      setVariantError(INVALID_PRODUCT_PRICE_MESSAGE);
      return;
    }

    const selectionError = validateCurrentSelection();
    if (selectionError) {
      setVariantError(selectionError);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      document.querySelector('.info__variants')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const cartUnitVariants: UnitVariants[] = Array.from({ length: quantity }, () => ({ ...selectedVariants }));
    if (!preview) addItem(product, quantity, cartUnitVariants);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuy = () => {
    setVariantError('');
    setMissingVariants([]);
    if (!hasValidPrice) {
      setVariantError(INVALID_PRODUCT_PRICE_MESSAGE);
      return;
    }

    const selectionError = validateCurrentSelection();
    if (selectionError) {
      setVariantError(selectionError);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      document.querySelector('.info__variants')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (quantity > 1 && hasVariants) {
      setIsVariantModalOpen(true);
      return;
    }
    // qty === 1 or no variants — go directly
    const sameVariants: UnitVariants[] = Array.from({ length: quantity }, () => ({ ...selectedVariants }));
    confirmPurchase(sameVariants);
  };

  return (
    <div className="product-detail">
      {!preview && (
        <SEO
          title={product.name}
          description={product.description?.slice(0, 160) || `Comprá ${product.name} en LIA. Moda femenina con envío a todo el país.`}
          path={`/product/${product.id}`}
          ogImage={product.images?.[0] || product.image}
          ogType="product"
        />
      )}
      <div className="product-detail__container">
        {/* Layout principal */}
        <div className="product-detail__main">
          {/* Columna izquierda - Carrusel */}
          <div className="product-detail__gallery">
            <div className="gallery__main">
              {images.length > 1 && (
                <button className="gallery__arrow gallery__arrow--left" onClick={handlePreviousImage}>
                  ‹
                </button>
              )}
              <img
                src={currentImage}
                alt={product.name}
                className="gallery__image"
                onClick={() => setIsImageModalOpen(true)}
                onLoad={() => setLoadedImageSrc(currentImage)}
                onError={() => setLoadedImageSrc(currentImage)}
                width={600}
                height={800}
              />
              {images.length > 1 && (
                <button className="gallery__arrow gallery__arrow--right" onClick={handleNextImage}>
                  ›
                </button>
              )}
              
              {pricing.hasPromotion && pricing.discountPercentage && (
                <div className="gallery__discount-badge">
                  -{pricing.discountPercentage}%
                </div>
              )}
            </div>

            {/* Thumbnails */}
            <div className="gallery__thumbnails">
              {images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`${product.name} ${index + 1}`}
                  className={`thumbnail ${index === currentImageIndex ? 'thumbnail--active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                  width={80}
                  height={107}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>

            {/* Indicadores de posición */}
            <div className="gallery__indicators">
              {images.map((_, index) => (
                <span
                  key={index}
                  className={`indicator ${index === currentImageIndex ? 'indicator--active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </div>
          </div>

          {/* Columna derecha - Información */}
          <div className="product-detail__info">
            <div className="info__header">
              <span className="info__condition">
                {product.condition === 'new' ? 'Nuevo' : 'Usado'} | 
                {product.stock && product.stock > 0 ? ` ${product.stock} disponibles` : ' Sin stock'}
              </span>
              <h1 className="info__title">{product.name}</h1>
            </div>

            {/* Precio */}
            <div className="info__pricing">
              {pricing.hasPromotion && pricing.originalPrice && pricing.discountPercentage && (
                <div className="pricing__original">
                  <span className="original-price">${pricing.originalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  <span className="discount-badge">{pricing.discountPercentage}% OFF</span>
                </div>
              )}
              <div className="pricing__final">
                ${discountedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              {!hasValidPrice && (
                <p className="pricing__warning">
                  Este producto no esta disponible para compra porque todavia no tiene un precio asignado.
                </p>
              )}
              {product.freeShipping && (
                <div className="pricing__shipping">
                  <span className="shipping-badge">Envío gratis</span>
                </div>
              )}
            </div>

            {/* Variantes */}
            {product.variants && product.variants.length > 0 && (
              <div className="info__variants">
                {(() => {
                  // Talle seleccionado actualmente (para filtrar colores disponibles)
                  const talleVariant = product.variants?.find(v => isSizeVariant(v.name));
                  const selectedTalle = talleVariant ? selectedVariants[talleVariant.name] : undefined;

                  return product.variants!.map((variant) => {
                    const isColor = variant.name.toLowerCase() === 'color';

                    // Colores disponibles para el talle seleccionado (si aplica).
                    // Un array vacío [] significa "sin configurar" (se trata igual que
                    // undefined) → todos los colores disponibles. Solo filtramos cuando
                    // hay al menos un color explícitamente habilitado para ese talle.
                    const rawColorsForTalle =
                      isColor && selectedTalle && talleVariant?.colorsByOption
                        ? talleVariant.colorsByOption[selectedTalle]
                        : undefined;
                    const availableColorsForTalle: string[] | undefined =
                      rawColorsForTalle && rawColorsForTalle.length > 0
                        ? rawColorsForTalle
                        : undefined;

                    return (
                      <div key={variant.name} className={`variant${missingVariants.includes(variant.name) ? ` variant--error${isShaking ? ' variant--shake' : ''}` : ''}`}>
                        <label className="variant__label">{variant.name}:</label>
                        <div className="variant__options">
                          {variant.options.map((option) => {
                            const isTalle = isSizeVariant(variant.name);
                            const isTalleOutOfStock = isTalle && !isVariantOptionAvailable(variant, option);

                            const { name: colorName, hex: colorHex } = isColor
                              ? parseColorOption(option)
                              : { name: option, hex: '' };

                            // Color no disponible en el talle seleccionado
                            const isColorUnavailableForTalle =
                              isColor && availableColorsForTalle !== undefined && !availableColorsForTalle.includes(option);

                            return isColor ? (
                              <div
                                key={option}
                                className={`variant__option-wrap${isColorUnavailableForTalle ? ' variant__option-wrap--soldout' : ''}`}
                                title={isColorUnavailableForTalle ? `${colorName} no disponible en talle ${selectedTalle}` : colorName}
                              >
                                <button
                                  className={`variant__color-circle ${selectedVariants[variant.name] === option ? 'variant__color-circle--selected' : ''} ${isColorUnavailableForTalle ? 'variant__color-circle--unavailable' : ''}`}
                                  style={{ backgroundColor: colorHex }}
                                  onClick={() => {
                                    if (!isColorUnavailableForTalle) handleVariantChange(variant.name, option);
                                  }}
                                  disabled={isColorUnavailableForTalle}
                                />
                                {isColorUnavailableForTalle && (
                                  <span className="variant__option-strike" aria-hidden="true" />
                                )}
                              </div>
                            ) : (
                              <div
                                key={option}
                                className={`variant__option-wrap ${isTalleOutOfStock ? 'variant__option-wrap--soldout' : ''}`}
                              >
                                <button
                                  className={`variant__option ${selectedVariants[variant.name] === option ? 'variant__option--selected' : ''} ${isTalleOutOfStock ? 'variant__option--soldout' : ''}`}
                                  onClick={() => {
                                    if (!isTalleOutOfStock) {
                                      handleVariantChange(variant.name, option);
                                    }
                                  }}
                                  disabled={isTalleOutOfStock}
                                >
                                  <span className="variant__option-text">
                                    {isTalle ? option.toUpperCase() : option}
                                  </span>
                                </button>
                                {isTalleOutOfStock && (
                                  <span className="variant__option-strike" aria-hidden="true" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
                <button 
                  className="size-guide-btn"
                  onClick={() => setIsSizeGuideOpen(true)}
                >
                  📏 Ver guía de talles
                </button>
              </div>
            )}

            {/* Cantidad */}
            <div className="info__quantity">
              <label className="quantity__label">Cantidad:</label>
              <div className="quantity__controls">
                <button
                  className="quantity__btn"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1 || quantityStockLimit === 0}
                >
                  -
                </button>
                <input
                  type="text"
                  className="quantity__input"
                  value={quantityStockLimit === 0 ? 0 : quantity}
                  readOnly
                />
                <button
                  className="quantity__btn"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantityStockLimit === 0 || quantity >= quantityStockLimit}
                >
                  +
                </button>
              </div>
              {quantityStockLimit === 0 && (
                <span className="quantity__available quantity__available--out">
                  Sin stock
                </span>
              )}
            </div>

            {/* Botones de acción */}
            {variantError && (
              <div className="variant-error-banner">
                <span className="variant-error-banner__icon">!</span>
                <span>{variantError}</span>
              </div>
            )}
            <div className="info__actions">
              <button
                className="action-btn action-btn--primary"
                onClick={handleBuy}
                disabled={quantityStockLimit === 0 || !hasValidPrice}
              >
                Comprar ahora
              </button>
              <button
                className={`action-btn action-btn--secondary${addedToCart ? ' action-btn--secondary-added' : ''}`}
                onClick={handleAddToCart}
                disabled={quantityStockLimit === 0 || !hasValidPrice || !canAddSelectedQuantityToCart}
              >
                {remainingCartCapacity <= 0
                  ? 'Stock máximo en carrito'
                  : addedToCart
                    ? '¡Agregado al carrito!'
                    : 'Agregar al carrito'}
              </button>
            </div>

            {/* Información adicional */}
            <div className="info__additional">
              <div className="additional__item">
                <span className="item__icon">🔒</span>
                <div className="item__content">
                  <strong>Compra Protegida</strong>
                  <p>Recibe el producto que esperabas o te devolvemos tu dinero</p>
                </div>
              </div>

              {product.warranty && (
                <div className="additional__item">
                  <span className="item__icon">✓</span>
                  <div className="item__content">
                    <strong>Garantía</strong>
                    <p>{product.warranty}</p>
                  </div>
                </div>
              )}

              {product.returnPolicy && (
                <div className="additional__item">
                  <span className="item__icon">↩️</span>
                  <div className="item__content">
                    <strong>Devolución gratis</strong>
                    <p>{product.returnPolicy}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sección de descripción detallada */}
        <div className="product-detail__description">
          <div className="description__tabs">
            <button 
              className={`tab ${activeTab === 'description' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Descripción
            </button>
            {product.specifications && product.specifications.length > 0 && (
              <button 
                className={`tab ${activeTab === 'specs' ? 'tab--active' : ''}`}
                onClick={() => setActiveTab('specs')}
              >
                Especificaciones
              </button>
            )}
            {product.faqs && product.faqs.length > 0 && (
              <button 
                className={`tab ${activeTab === 'faq' ? 'tab--active' : ''}`}
                onClick={() => setActiveTab('faq')}
              >
                Preguntas frecuentes
              </button>
            )}
          </div>

          <div className="description__content">
            {activeTab === 'description' && (
              <div className="content__description">
                <h2>Descripción</h2>
                <p>{product.description}</p>
                
                {product.features && product.features.length > 0 && (
                  <>
                    <h3>Características principales</h3>
                    <ul className="features-list">
                      {product.features.map((feature, index) => (
                        <li key={index}>
                          <span className="feature-icon">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {activeTab === 'specs' && product.specifications && (
              <div className="content__specs">
                <h2>Especificaciones técnicas</h2>
                <table className="specs-table">
                  <tbody>
                    {product.specifications.map((spec, index) => (
                      <tr key={index}>
                        <td className="spec-label">{spec.label}</td>
                        <td className="spec-value">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'faq' && product.faqs && (
              <div className="content__faq">
                <h2>Preguntas frecuentes</h2>
                {product.faqs.map((faq, index) => (
                  <div key={index} className="faq-item">
                    <h4 className="faq-question">{faq.question}</h4>
                    <p className="faq-answer">{faq.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de imagen ampliada */}
      {isImageModalOpen && (
        <div className="image-modal" onClick={() => setIsImageModalOpen(false)}>
          <div className="image-modal__content">
            <button className="image-modal__close" onClick={() => setIsImageModalOpen(false)}>
              ✕
            </button>
            <img src={currentImage} alt={product.name} />
          </div>
        </div>
      )}

      {/* Modal de Variantes / Guía de talles */}
      <Suspense fallback={null}>
        <Modal
          isOpen={isSizeGuideOpen}
          onClose={() => setIsSizeGuideOpen(false)}
          title="Guía de Talles"
        >
          <VariantTable
            sizeGuide={product.sizeGuide}
            sizes={product.variants?.find(v => isSizeVariant(v.name))?.options ?? []}
          />
        </Modal>
      </Suspense>

      {/* Modal de selección de variantes por unidad */}
      {isVariantModalOpen && (
        <PurchaseVariantModal
          isOpen={isVariantModalOpen}
          onClose={() => setIsVariantModalOpen(false)}
          onConfirm={confirmPurchase}
          product={product}
          quantity={quantity}
          initialVariants={selectedVariants}
        />
      )}
    </div>
  );
};

export default ProductDetailView;
