import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PackageX } from 'lucide-react';
import logoImg from '../../../assets/img/logo.jpeg';
import { fetchProductById, mapDbRowToProduct } from '../../../services/productService';
import type { Product } from '../../../types/product';
import Modal from '../../../components/common/Modal/Modal';
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

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<{ [key: string]: string }>({});
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
  // Trackers del patrón "ajustar estado en render" (reemplazan effects que
  // reseteaban estado al cambiar id / producto / límite de stock).
  const [loadedId, setLoadedId] = useState(id);
  const [variantsSyncedFor, setVariantsSyncedFor] = useState<string | number | null>(null);
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const setItem = useCartStore((s) => s.setItem);

  useBodyScrollLock(isImageModalOpen);

  // Reset al navegar entre productos: limpia el producto anterior antes de
  // que llegue el nuevo (evita mostrar el viejo mientras carga el otro).
  if (id !== loadedId) {
    setLoadedId(id);
    setProduct(null);
    setNotFound(false);
    setLoadedImageSrc('');
  }

  const images = product?.images || (product?.image ? [product.image] : []);
  const currentImage = images[currentImageIndex] || '';
  const isMainImageReady = currentImage === '' || loadedImageSrc === currentImage;

  // Sincroniza la selección de talles/colores con el producto recién cargado
  // (descarta opciones que ya no aplican). Solo corre una vez por producto.
  if (product && variantsSyncedFor !== product.id) {
    setVariantsSyncedFor(product.id);
    setSelectedVariants((prev) => sanitizeSelectedVariants(product, prev));
  }

  useInitialLoadTask('route', !notFound && (!product || (!!currentImage && !isMainImageReady)));

  useEffect(() => {
    let cancelled = false;

    fetchProductById(id!)
      .then((row) => {
        if (cancelled) return;
        // Producto inactivo, retirado o inexistente (null): estado "no disponible".
        if (!row) return setNotFound(true);
        const mapped = mapDbRowToProduct(row);
        // Producto sin stock (solo accesible por link directo; el catálogo ya lo oculta):
        // mismo estado "no disponible" en lugar de redirigir en silencio.
        if ((mapped.stock ?? 0) <= 0) return setNotFound(true);
        setProduct(mapped);
      })
      // Error real (red/servidor): también mostramos "no disponible".
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const discountedPrice = product ? getProductPricing(product).finalPrice : 0;
  const hasValidPrice = Number.isFinite(discountedPrice) && discountedPrice > 0;

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const stock = product?.stock ?? 0;
  const currentCartItem = product
    ? cartItems.find((item) => item.product.id === product.id)
    : undefined;
  const selectionStockLimit = product ? getSelectionStockLimit(product, selectedVariants) : 0;
  const remainingCartCapacity = product
    ? getAvailableQuantityForSelection(product, selectedVariants, currentCartItem?.unitVariants ?? [])
    : 0;
  const quantityStockLimit = Number.isFinite(selectionStockLimit) ? selectionStockLimit : stock;
  const canAddSelectedQuantityToCart = remainingCartCapacity > 0 && quantity <= remainingCartCapacity;

  useEffect(() => {
    if (!product) {
      return;
    }

    if (quantityStockLimit <= 0) {
      setQuantity(1);
      return;
    }

    setQuantity((prev) => Math.min(prev, quantityStockLimit));
  }, [quantityStockLimit]);

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

  const pricing = getProductPricing(product);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= quantityStockLimit) {
      setVariantError('');
      setQuantity(newQuantity);
    }
  };

  const handleVariantChange = (variantName: string, option: string) => {
    const variant = product?.variants?.find((currentVariant) => currentVariant.name === variantName);

    if (!product || !variant || !isVariantOptionAvailable(variant, option)) {
      return;
    }

    setSelectedVariants((prev) => sanitizeSelectedVariants(product, { ...prev, [variantName]: option }));
  };

  const hasVariants = (product?.variants?.length ?? 0) > 0;

  const getMissingVariants = (): string[] => {
    if (!product) return [];
    return getMissingVariantSelections(product, selectedVariants);
  };

  const getInvalidVariants = (): string[] => {
    if (!product) return [];
    return getInvalidVariantSelections(product, selectedVariants);
  };

  const validateCurrentSelection = (): string | null => {
    const invalid = getInvalidVariants();

    if (invalid.length > 0) {
      setMissingVariants(invalid);
      return invalid.some((variantName) => variantName.toLowerCase().startsWith('talle'))
        ? 'El talle seleccionado no tiene stock disponible. Elegí uno con stock.'
        : `La selección actual de ${invalid.join(', ')} no es válida.`;
    }

    const missing = getMissingVariants();

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

    if (!areUnitVariantSelectionsValid(product!, unitVariants)) {
      setVariantError('No se puede continuar con un talle sin stock. Elegí una opción disponible.');
      return;
    }

    setIsVariantModalOpen(false);
    setItem({
      product: product!,
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
    addItem(product!, quantity, cartUnitVariants);
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
      <SEO
        title={product.name}
        description={product.description?.slice(0, 160) || `Comprá ${product.name} en LIA. Moda femenina con envío a todo el país.`}
        path={`/product/${product.id}`}
        ogImage={product.images?.[0] || product.image}
        ogType="product"
      />
      <div className="product-detail__container">
        {/* Layout principal */}
        <div className="product-detail__main">
          {/* Columna izquierda - Carrusel */}
          <div className="product-detail__gallery">
            <div className="gallery__main">
              <button className="gallery__arrow gallery__arrow--left" onClick={handlePreviousImage}>
                ‹
              </button>
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
              <button className="gallery__arrow gallery__arrow--right" onClick={handleNextImage}>
                ›
              </button>
              
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

      {/* Modal de selección de variantes por unidad */}
      {isVariantModalOpen && product && (
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

export default ProductDetail;
