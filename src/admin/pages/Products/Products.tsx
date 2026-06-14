import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, BarChart2 } from 'lucide-react';
import { MenuItem, TextField } from '@mui/material';
import ProductTable from '../../components/ProductTable/ProductTable';
import ProductModal from '../../components/ProductModal/ProductModal';
import { useAdminStore, type AdminProduct } from '../../store/adminStore';
import { fetchAllProducts } from '../../../services/productService';
import { filterSelectSlotProps } from '../../../utils/labels';
import './Products.css';

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

const Products = () => {
    const navigate = useNavigate();
    const { setProducts, products } = useAdminStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterStock, setFilterStock] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
    const [loading, setLoading] = useState(true);

    const categories = useMemo(() => {
        const unique = [...new Set(products.map(p => p.category).filter(Boolean))];
        return unique.sort();
    }, [products]);

    const loadProducts = async () => {
        try {
            const data = await fetchAllProducts();
            setProducts(data.map((p: Record<string, unknown>) => mapProductRow(p)));
        } catch (err) {
            console.error('Error cargando productos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOpenModal = (product?: AdminProduct) => {
        setEditingProduct(product || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    return (
        <div className="admin-products-page">
            <div className="admin-page-header admin-flex-between">
                <div>
                    <h1 className="admin-page-title">Productos</h1>
                    <p className="admin-page-subtitle">Administra tu catálogo de productos.</p>
                </div>
                <div className="products-header-actions">
                    <button className="admin-btn-secondary admin-flex-center gap-2" onClick={() => navigate('/admin/sales')}>
                        <BarChart2 size={16} /> Ver ventas
                    </button>
                    <button className="admin-btn-primary admin-flex-center gap-2" onClick={() => handleOpenModal()}>
                        <Plus size={18} /> Nuevo Producto
                    </button>
                </div>
            </div>

            <div className="admin-card products-toolbar">
                <div className="search-input-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="toolbar-filters">
                    <TextField
                        select
                        className="filter-select"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        fullWidth
                        size="small"
                        slotProps={filterSelectSlotProps}
                    >
                        <MenuItem value="">Todas las categorías</MenuItem>
                        {categories.map(cat => (
                            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        className="filter-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        fullWidth
                        size="small"
                        slotProps={filterSelectSlotProps}
                    >
                        <MenuItem value="">Todos los estados</MenuItem>
                        <MenuItem value="active">Activo</MenuItem>
                        <MenuItem value="inactive">Inactivo</MenuItem>
                    </TextField>
                    <TextField
                        select
                        className="filter-select"
                        value={filterStock}
                        onChange={(e) => setFilterStock(e.target.value)}
                        fullWidth
                        size="small"
                        slotProps={filterSelectSlotProps}
                    >
                        <MenuItem value="">Todo el stock</MenuItem>
                        <MenuItem value="in_stock">En stock</MenuItem>
                        <MenuItem value="low_stock">Stock bajo (≤5)</MenuItem>
                        <MenuItem value="out_of_stock">Sin stock</MenuItem>
                    </TextField>
                </div>
            </div>

            <div className="admin-card table-card">
                {loading ? (
                    <p style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Cargando productos...</p>
                ) : (
                    <ProductTable
                        onEdit={handleOpenModal}
                        searchTerm={searchTerm}
                        filterCategory={filterCategory}
                        filterStatus={filterStatus}
                        filterStock={filterStock}
                    />
                )}
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                product={editingProduct}
                onSaved={loadProducts}
            />
        </div>
    );
};

export default Products;
