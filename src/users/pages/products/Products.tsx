import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Products.css';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import SEO from '../../../components/common/SEO/SEO';
import { fetchProducts, mapDbRowToProduct, fetchCategoriesTree, type Category } from '../../../services/productService';
import type { Product } from '../../../types/product';
import { useInitialLoadTask } from '../../../components/common/InitialLoad/InitialLoadProvider';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  useInitialLoadTask('route', loading);

  const activeCategory = searchParams.get('category') || 'Todos';
  const activeSubcategory = searchParams.get('subcategory') || '';
  const activeSubSub = searchParams.get('subsubcategory') || '';

  useEffect(() => {
    Promise.all([
      fetchProducts().then((rows) => rows.map(mapDbRowToProduct).filter((p) => (p.stock ?? 0) > 0)),
      fetchCategoriesTree(),
    ])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const filterBy = activeSubSub || activeSubcategory || activeCategory;
    if (filterBy === 'Todos') return products;
    const validNames = getAllDescendantNames(categories, filterBy);
    return products.filter((p) => validNames.has(p.category?.toLowerCase() ?? ''));
  }, [products, categories, activeCategory, activeSubcategory, activeSubSub]);

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


        {loading ? (
          <p className="products-loading">Cargando productos...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="products-empty">No hay productos en esta categoría.</p>
        ) : (
          <ProductGrid products={filteredProducts} />
        )}
      </div>
    </div>
  );
};

export default Products;
