import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Star, Eye } from 'lucide-react';
import { useAdminStore, type AdminProduct } from '../../store/adminStore';
import { toggleProductFeatured, fetchProducts } from '../../../services/productService';
import './FeaturedProductsManager.css';

const mapProductRow = (p: Record<string, unknown>): AdminProduct => ({
    id: String(p.id),
    name: p.name as string,
    price: p.price as number,
    originalPrice: (p.original_price as number) || undefined,
    stock: p.stock as number,
    category: (p.category as string) || '',
    imageUrl: (p.image_url as string) || '',
    images: (p.images as string[]) || undefined,
    description: (p.description as string) || undefined,
    discount: (p.discount as number) || undefined,
    condition: (p.condition as 'new' | 'used') || 'new',
    freeShipping: (p.free_shipping as boolean) || false,
    variants: (p.variants as AdminProduct['variants']) || undefined,
    specifications: (p.specifications as AdminProduct['specifications']) || undefined,
    features: (p.features as string[]) || undefined,
    faqs: (p.faqs as AdminProduct['faqs']) || undefined,
    warranty: (p.warranty as string) || undefined,
    returnPolicy: (p.return_policy as string) || undefined,
    status: (p.status as 'active' | 'inactive') || 'active',
    featured: (p.featured as boolean) || false,
});

const FeaturedProductsManager = () => {
    const { products, setProducts, updateProduct } = useAdminStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

    // Load products from DB if store is empty
    useEffect(() => {
        if (products.length === 0) {
            setLoading(true);
            fetchProducts()
                .then((data) => setProducts(data.map((p: Record<string, unknown>) => mapProductRow(p))))
                .catch((err) => console.error('Error cargando productos:', err))
                .finally(() => setLoading(false));
        }
    }, []);

    const featuredProducts = products.filter((p) => p.featured);

    const searchResults = searchTerm.trim()
        ? products.filter((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !p.featured &&
            p.status === 'active'
          )
        : [];

    const handleAdd = async (id: string) => {
        setTogglingIds((prev) => new Set(prev).add(id));
        try {
            await toggleProductFeatured(id, true);
            updateProduct(id, { featured: true });
            setSearchTerm('');
        } finally {
            setTogglingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        }
    };

    const handleRemove = async (id: string) => {
        setTogglingIds((prev) => new Set(prev).add(id));
        try {
            await toggleProductFeatured(id, false);
            updateProduct(id, { featured: false });
        } finally {
            setTogglingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        }
    };

    return (
        <div className="admin-card featured-manager">
            <div className="featured-manager-header">
                <div className="featured-header-text">
                    <h2 className="admin-card-title">Productos Destacados</h2>
                    <p className="admin-card-desc">Selecciona los productos que aparecerán en el home.</p>
                </div>
                <div className="featured-count-badge">
                    <Star size={14} />
                    <span>{featuredProducts.length} en home</span>
                </div>
            </div>

            {loading ? (
                <div className="featured-loading">Cargando productos...</div>
            ) : (
                <>
                    {/* Search */}
                    <div className="featured-search-container">
                        <div className="search-input-wrapper">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Buscar productos para destacar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {searchTerm.trim() && (
                            <div className="search-results-dropdown">
                                {searchResults.length === 0 ? (
                                    <div className="search-no-results">
                                        {products.length === 0
                                            ? 'No hay productos cargados'
                                            : 'No se encontraron productos sin destacar'}
                                    </div>
                                ) : (
                                    searchResults.map((prod) => (
                                        <div key={prod.id} className="search-result-item">
                                            {prod.imageUrl ? (
                                                <img src={prod.imageUrl} alt={prod.name} />
                                            ) : (
                                                <div className="placeholder-img"></div>
                                            )}
                                            <div className="result-info">
                                                <span className="result-name">{prod.name}</span>
                                                <span className="result-price">${prod.price}</span>
                                            </div>
                                            <button
                                                className="admin-btn-secondary"
                                                onClick={() => handleAdd(prod.id)}
                                                disabled={togglingIds.has(prod.id)}
                                            >
                                                <Plus size={16} />
                                                {togglingIds.has(prod.id) ? '...' : 'Agregar'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Featured list */}
                    <div className="featured-list">
                        {featuredProducts.length === 0 ? (
                            <div className="empty-state">
                                <Star size={32} className="empty-star-icon" />
                                <p>No hay productos destacados.</p>
                                <span>Busca un producto arriba para agregarlo al home.</span>
                            </div>
                        ) : (
                            featuredProducts.map((prod) => (
                                <div key={prod.id} className={`featured-item ${togglingIds.has(prod.id) ? 'toggling' : ''}`}>
                                    <div className="featured-item-img-wrap">
                                        {prod.imageUrl ? (
                                            <img src={prod.imageUrl} alt={prod.name} />
                                        ) : (
                                            <div className="placeholder-img"></div>
                                        )}
                                        <span className="featured-home-badge">
                                            <Eye size={10} /> Home
                                        </span>
                                    </div>
                                    <div className="featured-info">
                                        <h4>{prod.name}</h4>
                                        <div className="featured-meta">
                                            <span className="featured-category">{prod.category}</span>
                                            <span className="featured-price">${prod.price}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="admin-action-btn delete"
                                        onClick={() => handleRemove(prod.id)}
                                        disabled={togglingIds.has(prod.id)}
                                        title="Quitar del home"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default FeaturedProductsManager;
