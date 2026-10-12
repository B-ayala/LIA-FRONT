import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, BarChart2 } from 'lucide-react';
import { MenuItem, TextField } from '@mui/material';
import ProductTable from '../../components/ProductTable/ProductTable';
import ProductModal from '../../components/ProductModal/ProductModal';
import type { ProductDraft, ProductPreviewState } from '../../components/ProductModal/productDraft';
import ProductCardOptionsManager from '../../components/ProductCardOptionsManager/ProductCardOptionsManager';
import { useAdminStore, type AdminProduct } from '../../store/adminStore';
import { fetchAdminProducts, fetchProductById } from '../../../services/productService';
import { filterSelectSlotProps } from '../../../utils/labels';
import { extractErrorMessage } from '../../../utils/errorMessage';
import { mapAdminProductRow } from '../../utils/adminProductRow';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import './Products.css';

const Products = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setProducts, products, updateProduct: updateStoredProduct } = useAdminStore();
    const [openingProductId, setOpeningProductId] = useState<string | null>(null);
    const [openError, setOpenError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterStock, setFilterStock] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
    const [draft, setDraft] = useState<ProductDraft | null>(null);
    const [loading, setLoading] = useState(true);

    const categories = useMemo(() => {
        const unique = [...new Set(products.map(p => p.category).filter(Boolean))];
        return unique.sort();
    }, [products]);

    const loadProducts = async () => {
        try {
            const data = await fetchAdminProducts({ force: true });
            setProducts(data.map((p: Record<string, unknown>) => mapAdminProductRow(p)));
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

    // "Editar producto" desde la vista previa vuelve acá con el borrador para reabrir
    // el modal exactamente como se había dejado (producto existente o nuevo).
    const returnedPreview = (location.state as { editPreview?: ProductPreviewState } | null)?.editPreview;
    useEffect(() => {
        if (loading || !returnedPreview) return;
        const original = returnedPreview.productId
            ? products.find((p) => p.id === returnedPreview.productId) ?? null
            : null;
        // Si el producto ya no existe no se reabre: seguir como "nuevo" lo duplicaría al confirmar.
        const wasDeleted = returnedPreview.productId !== null && original === null;
        if (!wasDeleted) {
            setEditingProduct(original);
            setDraft(returnedPreview.draft);
            setIsModalOpen(true);
        }
        // Limpia el state para que un refresh o "atrás" no reabra el modal.
        navigate(location.pathname, { replace: true, state: null });
    }, [loading, returnedPreview, products, navigate, location.pathname]);

    // El formulario no guarda: se previsualiza y se persiste recién al confirmar.
    const handlePreview = (nextDraft: ProductDraft) => {
        const state: ProductPreviewState = { draft: nextDraft, productId: editingProduct?.id ?? null };
        navigate('/admin/products/preview', { state });
    };

    const openEditor = (product: AdminProduct | null) => {
        setEditingProduct(product);
        setDraft(null);
        setIsModalOpen(true);
    };

    // Al editar se relee el producto SIN caché: el listado puede tener hasta 30 s de antigüedad
    // y su `updated_at` es el que el backend compara para no pisar cambios de otro admin/ventas.
    const handleOpenModal = async (product?: AdminProduct) => {
        if (!product) {
            openEditor(null);
            return;
        }
        if (openingProductId) return;
        setOpeningProductId(product.id);
        setOpenError('');
        try {
            const row = await fetchProductById(product.id, false);
            if (!row) {
                setOpenError('Este producto ya no existe. Actualizá la lista.');
                return;
            }
            const fresh = mapAdminProductRow(row as Record<string, unknown>);
            updateStoredProduct(fresh.id, fresh);
            openEditor(fresh);
        } catch (err) {
            setOpenError(extractErrorMessage(err, 'No pudimos cargar el producto. Reintentá.'));
        } finally {
            setOpeningProductId(null);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setDraft(null);
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

            <ProductCardOptionsManager />

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

            {openingProductId && <p className="products-open-status" role="status">Cargando producto…</p>}
            {openError && <p className="products-open-status products-open-status--error" role="alert">{openError}</p>}

            <div className="admin-card table-card">
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 1rem', color: '#666' }}>
                        <LiaLoader size="md" />
                        <p style={{ margin: 0 }}>Cargando productos...</p>
                    </div>
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
                draft={draft}
                onPreview={handlePreview}
            />
        </div>
    );
};

export default Products;
