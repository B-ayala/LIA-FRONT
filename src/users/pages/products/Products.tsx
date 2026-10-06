import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Products.css';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import SEO from '../../../components/common/SEO/SEO';
import { fetchCatalogProductsPage, mapDbRowToProduct, fetchCategoriesTree, type Category } from '../../../services/productService';
import { cleanText } from '../../../utils/formatters';
import type { Product } from '../../../types/product';
import { useInitialLoadTask } from '../../../components/common/InitialLoad/InitialLoadProvider';
import { withTimeout } from '../../../utils/withTimeout';

const ALL_CATEGORIES = 'Todos';
const LOAD_ERROR_MESSAGE = 'No pudimos cargar los productos. Revisá tu conexión y reintentá.';

function getAllDescendantNames(categories: Category[], rootName: string): Set<string> {
  const root = categories.find(c => c.name.toLowerCase() === rootName.toLowerCase());
  if (!root) return new Set([rootName.toLowerCase()]);

  const result = new Set<string>();
  const queue = [root.id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const cat = categories.find(c => c.id === id);
    if (cat) result.add(cat.name.toLowerCase());
    for (const child of categories) {
      if (child.parent_id === id) queue.push(child.id);
    }
  }
  return result;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<'initial' | 'more' | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // Descarta respuestas de una categoría anterior si el usuario cambió de filtro en vuelo.
  const requestIdRef = useRef(0);
  const productsCountRef = useRef(0);

  useInitialLoadTask('route', loading);

  const activeCategory = searchParams.get('category') || ALL_CATEGORIES;
  const activeSubcategory = searchParams.get('subcategory') || '';
  const activeSubSub = searchParams.get('subsubcategory') || '';
  const filterBy = cleanText(activeSubSub || activeSubcategory || activeCategory);

  // El árbol de categorías es el que resuelve "categoría + descendientes" a nombres para
  // el filtro server-side, así que se necesita antes de pedir la primera página.
  const fetchPage = useCallback(async (offset: number) => {
    const categoryNames = filterBy === ALL_CATEGORIES
      ? undefined
      : [...getAllDescendantNames((await withTimeout(fetchCategoriesTree())) ?? [], filterBy)];
    const page = await withTimeout(fetchCatalogProductsPage({ offset, categoryNames }));
    if (!page) throw new Error('timeout');
    return { items: page.rows.map(mapDbRowToProduct), hasMore: page.hasMore };
  }, [filterBy]);

  const loadFirstPage = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setProducts([]);
    productsCountRef.current = 0;
    try {
      const page = await fetchPage(0);
      if (requestId !== requestIdRef.current) return;
      setProducts(page.items);
      productsCountRef.current = page.items.length;
      setHasMore(page.hasMore);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setHasMore(false);
      setError('initial');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = async () => {
    if (loadingMore) return;
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await fetchPage(productsCountRef.current);
      if (requestId !== requestIdRef.current) return;
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = [...prev, ...page.items.filter((p) => !seen.has(p.id))];
        productsCountRef.current = next.length;
        return next;
      });
      setHasMore(page.hasMore);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError('more');
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const breadcrumbItems = useMemo(() => {
    const items: { label: string; onClick?: () => void }[] = [
      { label: 'Shop', onClick: () => setSearchParams({}) },
    ];
    if (activeCategory && activeCategory !== 'Todos') {
      items.push({
        label: activeCategory,
        onClick: activeSubcategory
          ? () => setSearchParams({ category: activeCategory })
          : undefined,
      });
    }
    if (activeSubcategory) {
      items.push({
        label: activeSubcategory,
        onClick: activeSubSub
          ? () => setSearchParams({ category: activeCategory, subcategory: activeSubcategory })
          : undefined,
      });
    }
    if (activeSubSub) {
      items.push({ label: activeSubSub });
    }
    return items;
  }, [activeCategory, activeSubcategory, activeSubSub, setSearchParams]);

  return (
    <div className="products-page">
      <SEO
        title="Catálogo de Productos"
        description="Explorá nuestro catálogo completo de moda femenina. Ropa, accesorios y más con envío a todo el país."
        path="/products"
      />
      <div className="products-container">
        <h1 className="sr-only">Catálogo de Productos</h1>

        {/* Breadcrumb */}
        <nav className="products-breadcrumb" aria-label="breadcrumb">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            return (
              <span key={index} className="products-breadcrumb__item">
                {index > 0 && (
                  <span className="products-breadcrumb__separator" aria-hidden="true">›</span>
                )}
                {item.onClick && !isLast ? (
                  <button
                    className="products-breadcrumb__link"
                    onClick={item.onClick}
                    type="button"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className={`products-breadcrumb__current${isLast && index > 0 ? ' products-breadcrumb__current--active' : ''}`}>
                    {item.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>


        {error === 'initial' ? (
          <div className="products-state" role="alert">
            <p className="products-state__text">{LOAD_ERROR_MESSAGE}</p>
            <button type="button" className="products-more-btn" onClick={() => void loadFirstPage()}>
              Reintentar
            </button>
          </div>
        ) : !loading && products.length === 0 ? (
          <p className="products-empty">No hay productos en esta categoría.</p>
        ) : (
          <>
            <ProductGrid products={products} loading={loading} skeletonCount={8} />
            {!loading && (hasMore || error === 'more') && (
              <div className="products-state">
                {error === 'more' && (
                  <p className="products-state__text" role="alert">{LOAD_ERROR_MESSAGE}</p>
                )}
                <button
                  type="button"
                  className="products-more-btn"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Cargando...' : error === 'more' ? 'Reintentar' : 'Ver más'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Products;
