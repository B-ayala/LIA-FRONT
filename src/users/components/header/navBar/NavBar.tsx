import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiChevronRight, FiArrowLeft, FiX, FiShoppingCart, FiChevronDown, FiUser, FiLogOut, FiLock, FiShoppingBag } from 'react-icons/fi';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import { useClickOutside } from '../../../../hooks/useClickOutside';
// @ts-ignore - vite-imagetools query param
import logoImg from '../../../../assets/img/logo.jpeg?w=120&format=webp&quality=80';
import AuthModal from '../../auth/AuthModal';
import UserProfileDropdown from './UserProfileDropdown';
import ChangePasswordModal from './ChangePasswordModal';
import { useAuthStore } from '../../../../store/authStore';
import { fetchCategoriesTree, searchProducts, type Category, type ProductSearchResult } from '../../../../services/productService';
import { getProductPricing } from '../../../../utils/pricing';
import { buildCloudinaryUrl } from '../../../../utils/cloudinary';
import { useCartStore } from '../../../../store/cartStore';
import CartDrawer from '../../cart/CartDrawer';
import MyPurchasesModal from './MyPurchasesModal';
import { useInitialLoadTask } from '../../../../components/common/InitialLoad/InitialLoadProvider';
import './NavBar.css';

const staticNavBefore = [{ name: 'Inicio', path: '/' }];
const staticNavAfter = [
  { name: 'Contacto', path: '/contact' },
  { name: 'Acerca de', path: '/about' },
];

function buildChildMap(cats: Category[]): Map<string | null, Category[]> {
  const map = new Map<string | null, Category[]>();
  for (const cat of cats) {
    const key = cat.parent_id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(cat);
  }
  return map;
}

const NavBar = () => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobilePasswordModalOpen, setIsMobilePasswordModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobilePurchasesModalOpen, setIsMobilePurchasesModalOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems());
  const prevTotalRef = React.useRef(totalItems);

  useEffect(() => {
    if (totalItems > prevTotalRef.current) {
      setCartBump(true);
      const t = setTimeout(() => setCartBump(false), 600);
      prevTotalRef.current = totalItems;
      return () => clearTimeout(t);
    }
    prevTotalRef.current = totalItems;
  }, [totalItems]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  // Mobile: track which level-1 and level-2 category the user drilled into
  const [mobileL1, setMobileL1] = useState<Category | null>(null);
  const [mobileL2, setMobileL2] = useState<Category | null>(null);
  const [mobileInProductsMenu, setMobileInProductsMenu] = useState(false);
  const currentUser = useAuthStore(state => state.currentUser);
  const logout = useAuthStore(state => state.logout);

  useBodyScrollLock(mobileMenuOpen);
  useInitialLoadTask('public-layout', isCategoriesLoading);

  useEffect(() => {
    fetchCategoriesTree()
      .then(setCategoryTree)
      .catch(console.error)
      .finally(() => setIsCategoriesLoading(false));
  }, []);

  const childMap = buildChildMap(categoryTree);
  const level1Cats = childMap.get(null) ?? [];


  const closeMenu = () => {
    setMobileMenuOpen(false);
    setTimeout(() => {
      setMobileL1(null);
      setMobileL2(null);
      setMobileInProductsMenu(false);
    }, 300);
  };

  const handleLogout = async () => { await logout(); };

  const handleMobileChangePassword = () => {
    closeMenu();
    setIsMobilePasswordModalOpen(true);
  };

  const handleMobilePurchases = () => {
    closeMenu();
    setIsMobilePurchasesModalOpen(true);
  };

  const closeSearchResults = useCallback(() => setShowResults(false), []);
  useClickOutside(searchRef, closeSearchResults);

  const handleToggleSearch = () => {
    if (searchOpen) {
      setSearchOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      setShowResults(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    } else {
      setSearchOpen(true);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    debounceRef.current = setTimeout(async () => {
      const results = await searchProducts(value.trim());
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  };

  const handleResultClick = (id: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    navigate(`/product/${id}`);
  };

  return (
    <nav className="navbar">
      {/* Burbujas animadas */}
      <div className="bubbles">
        {[...Array(10)].map((_, i) => <div key={i} className="bubble"></div>)}
      </div>

      <div className="navbar-container">
        {/* Mobile Menu Toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menú de navegación"
          aria-expanded={mobileMenuOpen}
          aria-controls="nav-menu-slider"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <img src={logoImg} alt="LIA Logo" className="logo-img" width={120} height={40} />
        </Link>

        {/* Desktop Navigation */}
        <div className="desktop-nav hide-mobile">
          <ul className="desktop-nav-list">
            {staticNavBefore.map(item => (
              <li key={item.name} className="desktop-nav-item">
                <Link to={item.path} className="desktop-nav-link">{item.name}</Link>
              </li>
            ))}

            {level1Cats.length > 0 && (
              <li className="desktop-nav-item">
                <Link to="/products" className="desktop-nav-link">
                  Productos
                  <FiChevronDown className="desktop-nav-arrow" />
                </Link>

                {/* Nivel 1: categorías principales */}
                <ul className="desktop-dropdown">
                  {level1Cats.map(cat => {
                    const subs = childMap.get(cat.id) ?? [];
                    const hasSubs = subs.length > 0;
                    return (
                      <li key={cat.id} className={`desktop-dropdown-item${hasSubs ? ' has-submenu' : ''}`}>
                        <Link to={`/products?category=${cat.name}`} className="desktop-dropdown-link">
                          {cat.name}
                          {hasSubs && <FiChevronRight className="submenu-arrow" />}
                        </Link>

                        {/* Nivel 2: subcategorías */}
                        {hasSubs && (
                          <ul className="desktop-subdropdown">
                            {subs.map(sub => {
                              const subChildren = childMap.get(sub.id) ?? [];
                              const hasChildren = subChildren.length > 0;
                              return (
                                <li key={sub.id} className={`desktop-dropdown-item${hasChildren ? ' has-submenu' : ''}`}>
                                  <Link
                                    to={`/products?category=${cat.name}&subcategory=${sub.name}`}
                                    className="desktop-dropdown-link"
                                  >
                                    {sub.name}
                                    {hasChildren && <FiChevronRight className="submenu-arrow" />}
                                  </Link>

                                  {/* Nivel 3: sub-subcategorías */}
                                  {hasChildren && (
                                    <ul className="desktop-subdropdown">
                                      {subChildren.map(child => (
                                        <li key={child.id} className="desktop-dropdown-item">
                                          <Link
                                            to={`/products?category=${cat.name}&subcategory=${sub.name}&subsubcategory=${child.name}`}
                                            className="desktop-dropdown-link"
                                          >
                                            {child.name}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            )}

            {staticNavAfter.map(item => (
              <li key={item.name} className="desktop-nav-item">
                <Link to={item.path} className="desktop-nav-link">{item.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile Overlay */}
        <div
          className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
          onClick={closeMenu}
        />

        {/* Menú Principal Deslizable — 3 paneles */}
        <div className={`nav-menu-slider ${mobileMenuOpen ? 'active' : ''}`} id="nav-menu-slider">

          {/* Panel 0: Menú Principal */}
          <div className={`nav-menu-level level-main ${mobileInProductsMenu ? 'slide-out' : ''}`}>
            <div className="nav-menu-header">
              <span className="nav-menu-title">Menú</span>
              <button className="nav-menu-close" onClick={closeMenu} aria-label="Cerrar menú"><FiX /></button>
            </div>

            {currentUser && (
              <div style={{ padding: '0', borderBottom: '1px solid rgba(184,165,200,0.2)' }}>
                <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiUser size={20} />
                    <span style={{ fontWeight: 500 }}>{currentUser.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#c0392b', display: 'flex', alignItems: 'center' }}
                    aria-label="Cerrar sesión"
                  >
                    <FiLogOut size={18} aria-hidden="true" />
                  </button>
                </div>
                <button
                  onClick={handleMobilePurchases}
                  style={{ width: '100%', padding: '0.9rem 1rem', background: 'none', border: 'none', borderTop: '1px solid rgba(184,165,200,0.15)', cursor: 'pointer', color: 'var(--text-dark)', fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'background-color var(--transition-fast)', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-bg)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Mis compras"
                >
                  <FiShoppingBag size={18} />
                  <span>Mis compras</span>
                </button>
                <button
                  onClick={handleMobileChangePassword}
                  style={{ width: '100%', padding: '0.9rem 1rem', background: 'none', border: 'none', borderTop: '1px solid rgba(184,165,200,0.15)', cursor: 'pointer', color: 'var(--text-dark)', fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'background-color var(--transition-fast)', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-bg)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Cambiar contraseña"
                >
                  <FiLock size={18} />
                  <span>Cambiar contraseña</span>
                </button>
              </div>
            )}

            <ul className="nav-menu-list">
              {staticNavBefore.map(item => (
                <li key={item.name} className="nav-menu-item">
                  <Link to={item.path} className="nav-link" onClick={closeMenu}>{item.name}</Link>
                </li>
              ))}

              {/* Productos - Expandible para mostrar categorías */}
              {level1Cats.length > 0 && (
                <li className="nav-menu-item">
                  <button
                    className="nav-link-btn"
                    onClick={() => setMobileInProductsMenu(true)}
                  >
                    Productos
                    <FiChevronRight className="nav-link-arrow" />
                  </button>
                </li>
              )}

              {staticNavAfter.map(item => (
                <li key={item.name} className="nav-menu-item">
                  <Link to={item.path} className="nav-link" onClick={closeMenu}>{item.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Panel 1: Categorías de nivel 1 (dentro de Productos) */}
          <div className={`nav-menu-level level-sub ${
            mobileInProductsMenu && mobileL1 === null
              ? 'slide-in'
              : mobileInProductsMenu && mobileL1 !== null
                ? 'slide-out'
                : ''
          }`}>
            <div className="nav-menu-header">
              <button
                className="nav-menu-back"
                onClick={() => setMobileInProductsMenu(false)}
                aria-label="Volver al menú principal"
              >
                <FiArrowLeft />
              </button>
              <span className="nav-menu-title">PRODUCTOS</span>
              <button className="nav-menu-close" onClick={closeMenu} aria-label="Cerrar menú"><FiX /></button>
            </div>
            <ul className="nav-menu-list">
              <li className="nav-menu-item">
                <Link
                  to="/products"
                  className="nav-link view-all-link"
                  onClick={closeMenu}
                >
                  Ver todos los productos
                </Link>
              </li>
              {level1Cats.map(cat => {
                const hasSubs = (childMap.get(cat.id) ?? []).length > 0;
                return (
                  <li key={cat.id} className="nav-menu-item">
                    {hasSubs ? (
                      <button className="nav-link-btn" onClick={() => setMobileL1(cat)}>
                        {cat.name}
                        <FiChevronRight className="nav-link-arrow" />
                      </button>
                    ) : (
                      <Link
                        to={`/products?category=${cat.name}`}
                        className="nav-link"
                        onClick={closeMenu}
                      >
                        {cat.name}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Panel 2: Subcategorías del nivel 1 seleccionado */}
          <div className={`nav-menu-level level-sub ${
            mobileInProductsMenu && mobileL1 !== null && mobileL2 === null
              ? 'slide-in'
              : mobileInProductsMenu && mobileL2 !== null
                ? 'slide-out'
                : ''
          }`}>
            <div className="nav-menu-header">
              <button className="nav-menu-back" onClick={() => setMobileL1(null)} aria-label="Volver a productos">
                <FiArrowLeft />
              </button>
              <span className="nav-menu-title">{mobileL1?.name.toUpperCase()}</span>
              <button className="nav-menu-close" onClick={closeMenu} aria-label="Cerrar menú"><FiX /></button>
            </div>
            <ul className="nav-menu-list">
              {mobileL1 && (
                <li className="nav-menu-item">
                  <Link
                    to={`/products?category=${mobileL1.name}`}
                    className="nav-link view-all-link"
                    onClick={closeMenu}
                  >
                    Ver todo en {mobileL1.name}
                  </Link>
                </li>
              )}
              {(mobileL1 ? childMap.get(mobileL1.id) ?? [] : []).map(sub => {
                const hasChildren = (childMap.get(sub.id) ?? []).length > 0;
                return (
                  <li key={sub.id} className="nav-menu-item">
                    {hasChildren ? (
                      <button className="nav-link-btn" onClick={() => setMobileL2(sub)}>
                        {sub.name}
                        <FiChevronRight className="nav-link-arrow" />
                      </button>
                    ) : (
                      <Link
                        to={`/products?category=${mobileL1!.name}&subcategory=${sub.name}`}
                        className="nav-link"
                        onClick={closeMenu}
                      >
                        {sub.name}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Panel 3: Sub-subcategorías del nivel 2 seleccionado */}
          <div className={`nav-menu-level level-sub ${
            mobileInProductsMenu && mobileL2 !== null ? 'slide-in' : ''
          }`}>
            <div className="nav-menu-header">
              <button className="nav-menu-back" onClick={() => setMobileL2(null)} aria-label={`Volver a ${mobileL1?.name ?? 'categorías'}`}><FiArrowLeft /></button>
              <span className="nav-menu-title">{mobileL2?.name.toUpperCase()}</span>
              <button className="nav-menu-close" onClick={closeMenu} aria-label="Cerrar menú"><FiX /></button>
            </div>
            <ul className="nav-menu-list">
              {mobileL2 && (
                <li className="nav-menu-item">
                  <Link
                    to={`/products?category=${mobileL1!.name}&subcategory=${mobileL2.name}`}
                    className="nav-link view-all-link"
                    onClick={closeMenu}
                  >
                    Ver todo en {mobileL2.name}
                  </Link>
                </li>
              )}
              {(mobileL2 ? childMap.get(mobileL2.id) ?? [] : []).map(child => (
                <li key={child.id} className="nav-menu-item">
                  <Link
                    to={`/products?category=${mobileL1!.name}&subcategory=${mobileL2!.name}&subsubcategory=${child.name}`}
                    className="nav-link"
                    onClick={closeMenu}
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Side Icons */}
        <div className="navbar-right">
          <div className="search-container" ref={searchRef}>
            <button
              className="icon-btn"
              onClick={handleToggleSearch}
              aria-label={searchOpen ? 'Cerrar búsqueda' : 'Abrir búsqueda'}
              aria-expanded={searchOpen}
            >
              <FiSearch className="icon" aria-hidden="true" />
            </button>
            {searchOpen && (
              <input
                type="text"
                placeholder="Buscar productos..."
                className="search-input"
                autoFocus
                value={searchQuery}
                onChange={handleSearchChange}
              />
            )}
            {searchOpen && showResults && (
              <div className="search-results-dropdown">
                {isSearching ? (
                  <p className="search-loading">Buscando...</p>
                ) : searchResults.length === 0 ? (
                  <p className="search-no-results">No se encontraron productos</p>
                ) : (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      className="search-result-item"
                      onClick={() => handleResultClick(result.id)}
                    >
                      {result.image && (
                        <img
                          src={buildCloudinaryUrl(result.image, {
                            width: 60,
                            quality: 'auto',
                            format: 'auto'
                          })}
                          alt={result.name}
                          className="search-result-img"
                          loading="lazy"
                          decoding="async"
                          width={60}
                          height={60}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="search-result-info">
                        <p className="search-result-name">{result.name}</p>
                        <p className="search-result-price">$ {getProductPricing(result).finalPrice.toLocaleString('es-AR')}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {currentUser ? (
            <UserProfileDropdown user={currentUser} onLogout={handleLogout} />
          ) : (
            <>
              <button className="login-btn hide-mobile" onClick={() => setIsAuthModalOpen(true)}>
                Iniciar sesion
              </button>
              <button className="icon-btn hide-desktop" onClick={() => setIsAuthModalOpen(true)} aria-label="Iniciar sesión">
                <FiUser className="icon" aria-hidden="true" />
              </button>
            </>
          )}
          <button
            className={`icon-btn cart-badge-wrapper${cartBump ? ' cart-bump' : ''}`}
            onClick={() => setIsCartOpen(true)}
            aria-label={totalItems > 0 ? `Abrir carrito, ${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}` : 'Abrir carrito'}
          >
            <FiShoppingCart className="icon" aria-hidden="true" />
            {totalItems > 0 && <span className="cart-badge" aria-hidden="true">{totalItems}</span>}
          </button>
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ChangePasswordModal isOpen={isMobilePasswordModalOpen} onClose={() => setIsMobilePasswordModalOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      {currentUser && (
        <MyPurchasesModal
          isOpen={isMobilePurchasesModalOpen}
          onClose={() => setIsMobilePurchasesModalOpen(false)}
          email={currentUser.email}
        />
      )}
    </nav>
  );
};

export default NavBar;
