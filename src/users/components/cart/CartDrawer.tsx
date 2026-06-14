import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiTrash2, FiShoppingCart } from 'react-icons/fi';
import { useCartStore } from '../../../store/cartStore';
import type { UnitVariants } from '../../../store/cartStore';
import { useAuthStore } from '../../../store/authStore';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { getProductPricing } from '../../../utils/pricing';
import { buildCloudinaryUrl } from '../../../utils/cloudinary';
import { areUnitVariantSelectionsValid } from '../../../utils/productVariants';
import { formatPrice, buildVariantLine } from '../../../utils/formatters';
import AuthModal from '../auth/AuthModal';
import PurchaseVariantModal from '../PurchaseVariantModal/PurchaseVariantModal';
import './CartDrawer.css';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroupedVariantRow {
  key: string;
  count: number;
  fragments: string[];
  variants: UnitVariants;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedProductIdForVariantModal, setSelectedProductIdForVariantModal] = useState<string | number | null>(null);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    document.body.classList.toggle('cart-drawer-open', isOpen);

    return () => {
      document.body.classList.remove('cart-drawer-open');
    };
  }, [isOpen]);

  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const setUnitVariants = useCartStore((s) => s.setUnitVariants);
  const replaceItemUnits = useCartStore((s) => s.replaceItemUnits);
  const clearCart = useCartStore((s) => s.clearCart);
  const setItem = useCartStore((s) => s.setItem);
  const selectedCartItem = items.find((item) => item.product.id === selectedProductIdForVariantModal) ?? null;

  const total = items.reduce((sum, i) => sum + getProductPricing(i.product).finalPrice * i.quantity, 0);

  const openProductDetail = (productId: string | number) => {
    setIsVariantModalOpen(false);
    setSelectedProductIdForVariantModal(null);
    onClose();
    navigate(`/product/${productId}`);
  };

  const continueToCheckout = (unitVariants?: UnitVariants[]) => {
    const cartItem = selectedCartItem ?? items[0];
    if (cartItem && unitVariants) {
      setUnitVariants(cartItem.product.id, unitVariants);
    }

    // Limpiar cualquier item directo persistido para que checkout muestre todos los del carrito
    setItem(null);

    setIsVariantModalOpen(false);
    setSelectedProductIdForVariantModal(null);
    onClose();

    if (currentUser) {
      navigate('/checkout');
      return;
    }

    setIsAuthModalOpen(true);
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      return;
    }

    const invalidCartItem = items.find((cartItem) => {
      const hasVariants = (cartItem.product.variants?.length ?? 0) > 0;
      return hasVariants && !areUnitVariantSelectionsValid(cartItem.product, cartItem.unitVariants);
    });

    if (invalidCartItem) {
      setSelectedProductIdForVariantModal(invalidCartItem.product.id);
      setIsVariantModalOpen(true);
      return;
    }

    setSelectedProductIdForVariantModal(null);
    continueToCheckout();
  };

  const buildVariantLines = (variants: UnitVariants): string[] =>
    Object.entries(variants).map(([name, value]) => buildVariantLine(name, value));

  const groupUnitVariants = (unitVariants: UnitVariants[]): GroupedVariantRow[] => {
    const groupedRows = new Map<string, GroupedVariantRow>();

    unitVariants.forEach((variants) => {
      const line = buildVariantLines(variants);

      if (line.length === 0) {
        return;
      }

      const key = JSON.stringify(
        Object.entries(variants).sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
      );
      const existingGroup = groupedRows.get(key);

      if (existingGroup) {
        existingGroup.count += 1;
        return;
      }

      groupedRows.set(key, {
        key,
        count: 1,
        fragments: line,
        variants: { ...variants },
      });
    });

    return Array.from(groupedRows.values());
  };

  const updateVariantGroupQuantity = (
    productId: string | number,
    unitVariants: UnitVariants[],
    targetVariants: UnitVariants,
    delta: number
  ) => {
    const targetKey = JSON.stringify(
      Object.entries(targetVariants).sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    );

    if (delta > 0) {
      replaceItemUnits(productId, [...unitVariants, { ...targetVariants }]);
      return;
    }

    let removed = false;
    const nextUnitVariants = unitVariants.filter((variants) => {
      if (removed) {
        return true;
      }

      const currentKey = JSON.stringify(
        Object.entries(variants).sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
      );

      if (currentKey === targetKey) {
        removed = true;
        return false;
      }

      return true;
    });

    replaceItemUnits(productId, nextUnitVariants);
  };

  return (
    <>
      <div className={`cart-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <div className={`cart-drawer ${isOpen ? 'active' : ''}`}>
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">
            <FiShoppingCart aria-hidden="true" /> Carrito
          </h2>
          <button className="cart-drawer__close" onClick={onClose} aria-label="Cerrar carrito">
            <FiX aria-hidden="true" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            <FiShoppingCart className="cart-drawer__empty-icon" />
            <p>Tu carrito esta vacio</p>
          </div>
        ) : (
          <>
            <ul className="cart-drawer__list">
              {items.map((item) => {
                const pricing = getProductPricing(item.product);
                const groupedVariants = groupUnitVariants(item.unitVariants);
                const productSubtotal = pricing.finalPrice * item.quantity;

                return (
                  <li key={item.product.id} className="cart-drawer__item">
                    <div className="cart-drawer__item-link">
                      <button
                        type="button"
                        className="cart-drawer__item-preview"
                        onClick={() => openProductDetail(item.product.id)}
                        aria-label={`Ver detalle de ${item.product.name}`}
                      >
                        <img
                          src={buildCloudinaryUrl(item.product.image, {
                            width: 72,
                            height: 96,
                            crop: 'fit',
                            quality: 'auto',
                            format: 'auto'
                          })}
                          alt={item.product.name}
                          className="cart-drawer__item-img"
                          loading="lazy"
                          decoding="async"
                          width={72}
                          height={96}
                        />
                      </button>
                      <div className="cart-drawer__item-info">
                        <div className="cart-drawer__item-header-row">
                          <button
                            type="button"
                            className="cart-drawer__item-name-button"
                            onClick={() => openProductDetail(item.product.id)}
                          >
                            <span className="cart-drawer__item-name">{item.product.name}</span>
                          </button>
                          <button
                            type="button"
                            className="cart-drawer__remove cart-drawer__remove--inline"
                            onClick={() => removeItem(item.product.id)}
                            aria-label={`Eliminar ${item.product.name} del carrito`}
                          >
                            <FiTrash2 aria-hidden="true" />
                          </button>
                        </div>
                        <span className="cart-drawer__item-total-units">
                          {item.quantity} {item.quantity === 1 ? 'unidad total' : 'unidades totales'}
                        </span>
                        {groupedVariants.length > 0 && (
                          <div className="cart-drawer__variant-list">
                            {groupedVariants.map((group) => {
                              const canIncrease = areUnitVariantSelectionsValid(item.product, [...item.unitVariants, { ...group.variants }]);

                              return (
                                <div key={`${String(item.product.id)}-${group.key}`} className="cart-drawer__variant-row">
                                  <span className="cart-drawer__variants-value">
                                    {group.fragments.join(' · ')}
                                  </span>
                                  <div className="cart-drawer__variant-controls">
                                    <button
                                      type="button"
                                      className="cart-drawer__qty-btn"
                                      onClick={() => updateVariantGroupQuantity(item.product.id, item.unitVariants, group.variants, -1)}
                                      aria-label={`Reducir cantidad de ${group.fragments.join(' ')} en ${item.product.name}`}
                                    >
                                      <span aria-hidden="true">−</span>
                                    </button>
                                    <span className="cart-drawer__item-qty" aria-label={`Cantidad: ${group.count}`}>
                                      {group.count}
                                    </span>
                                    <button
                                      type="button"
                                      className="cart-drawer__qty-btn"
                                      onClick={() => updateVariantGroupQuantity(item.product.id, item.unitVariants, group.variants, 1)}
                                      disabled={!canIncrease}
                                      aria-label={`Aumentar cantidad de ${group.fragments.join(' ')} en ${item.product.name}`}
                                    >
                                      <span aria-hidden="true">+</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="cart-drawer__item-summary cart-drawer__item-summary--inline">
                          <span className="cart-drawer__item-price">{formatPrice(productSubtotal)}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="cart-drawer__footer">
              <div className="cart-drawer__total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button className="cart-drawer__clear" onClick={clearCart}>
                Vaciar carrito
              </button>
              <button
                className="cart-drawer__checkout"
                onClick={handleCheckout}
              >
                Ir a pagar
              </button>
            </div>
          </>
        )}
      </div>

      {selectedCartItem && (
        <PurchaseVariantModal
          isOpen={isVariantModalOpen}
          onClose={() => {
            setIsVariantModalOpen(false);
            setSelectedProductIdForVariantModal(null);
          }}
          onConfirm={continueToCheckout}
          product={selectedCartItem.product}
          quantity={selectedCartItem.quantity}
          initialVariants={selectedCartItem.unitVariants[0] ?? {}}
          initialUnitVariants={selectedCartItem.unitVariants}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          navigate('/checkout');
        }}
      />
    </>
  );
};

export default CartDrawer;
