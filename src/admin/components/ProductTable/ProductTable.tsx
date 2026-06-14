import { useState } from 'react';
import { Pagination, Box } from '@mui/material';
import { Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { useAdminStore, type AdminProduct } from '../../store/adminStore';
import { StockBadge, StatusBadge } from './ProductBadges';
import ConfirmationModal from '../../../components/common/Modal/ConfirmationModal';
import { deleteProduct as deleteProductApi } from '../../../services/productService';
import { getAuthToken } from '../../../utils/auth';
import { usePagination } from '../../../hooks/usePagination';
import './ProductTable.css';

interface ProductTableProps {
    onEdit: (product: AdminProduct) => void;
    searchTerm: string;
    filterCategory?: string;
    filterStatus?: string;
    filterStock?: string;
}

const ProductTable = ({ onEdit, searchTerm, filterCategory = '', filterStatus = '', filterStock = '' }: ProductTableProps) => {
    const { products, deleteProduct } = useAdminStore();
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdminProduct, direction: 'asc' | 'desc' } | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Filter by search term
    let filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter by category
    if (filterCategory) {
        filteredProducts = filteredProducts.filter(p => p.category === filterCategory);
    }

    // Filter by status
    if (filterStatus) {
        filteredProducts = filteredProducts.filter(p => p.status === filterStatus);
    }

    // Filter by stock
    if (filterStock === 'in_stock') {
        filteredProducts = filteredProducts.filter(p => p.stock > 0);
    } else if (filterStock === 'low_stock') {
        filteredProducts = filteredProducts.filter(p => p.stock > 0 && p.stock <= 5);
    } else if (filterStock === 'out_of_stock') {
        filteredProducts = filteredProducts.filter(p => p.stock === 0);
    }

    // Sort
    if (sortConfig !== null) {
        const { key, direction } = sortConfig;
        filteredProducts.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            // != null cubre undefined y null (este último válido p/ discount).
            if (aVal != null && bVal != null) {
                if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    const { currentPage, setCurrentPage, totalPages, paginated: paginatedProducts } = usePagination(filteredProducts, {
        itemsPerPage: 5,
        resetDeps: [searchTerm, filterCategory, filterStatus, filterStock],
    });

    const requestSort = (key: keyof AdminProduct) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="admin-product-table-container">
            {/* Mobile: card layout */}
            <div className="product-card-list">
                {filteredProducts.length === 0 ? (
                    <p className="empty-message">No se encontraron productos.</p>
                ) : (
                    paginatedProducts.map((product) => (
                        <div className="product-card" key={product.id}>
                            <div className="product-card-top">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="product-card-img" />
                                ) : (
                                    <div className="product-card-img-placeholder"></div>
                                )}
                                <div className="product-card-info">
                                    <span className="product-card-name">{product.name}</span>
                                    <span className="product-card-category">{product.category}</span>
                                </div>
                                <div className="product-card-actions">
                                    <button onClick={() => onEdit(product)} className="admin-action-btn edit" title="Editar">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(product.id)} className="admin-action-btn delete" title="Eliminar">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="product-card-bottom">
                                <div className="product-card-field">
                                    <span className="field-label">Precio</span>
                                    <span className="field-value">${product.price}</span>
                                </div>
                                <div className="product-card-field">
                                    <span className="field-label">Stock</span>
                                    <StockBadge stock={product.stock} />
                                </div>
                                <div className="product-card-field">
                                    <span className="field-label">Estado</span>
                                    <StatusBadge status={product.status} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tablet+: table layout */}
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Imagen</th>
                        <th onClick={() => requestSort('name')} className="sortable">
                            Nombre <ArrowUpDown size={14} />
                        </th>
                        <th onClick={() => requestSort('price')} className="sortable">
                            Precio <ArrowUpDown size={14} />
                        </th>
                        <th onClick={() => requestSort('stock')} className="sortable">
                            Stock <ArrowUpDown size={14} />
                        </th>
                        <th onClick={() => requestSort('category')} className="sortable">
                            Categoría <ArrowUpDown size={14} />
                        </th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredProducts.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="text-center py-4 text-slate-500">No se encontraron productos.</td>
                        </tr>
                    ) : (
                        paginatedProducts.map((product) => (
                            <tr key={product.id}>
                                <td>
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="table-img" />
                                    ) : (
                                        <div className="table-img-placeholder"></div>
                                    )}
                                </td>
                                <td className="font-medium">{product.name}</td>
                                <td>${product.price}</td>
                                <td>
                                    <StockBadge stock={product.stock} />
                                </td>
                                <td>{product.category}</td>
                                <td>
                                    <StatusBadge status={product.status} />
                                </td>
                                <td>
                                    <div className="table-actions">
                                        <button onClick={() => onEdit(product)} className="admin-action-btn edit" title="Editar">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => setConfirmDeleteId(product.id)} className="admin-action-btn delete" title="Eliminar">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

        {totalPages > 1 && (
            <Box display="flex" justifyContent="center" alignItems="center" pt={1} pb={0.5}>
                <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(_, page) => setCurrentPage(page)}
                    size="small"
                    siblingCount={1}
                    boundaryCount={1}
                    color="primary"
                />
            </Box>
        )}

        <ConfirmationModal
            isOpen={confirmDeleteId !== null}
            onClose={() => setConfirmDeleteId(null)}
            title="Eliminar producto"
            message="¿Estás seguro de que querés eliminar este producto? Esta acción no se puede deshacer."
            status="error"
            actionButtonText="Eliminar"
            cancelButtonText="Cancelar"
            onActionClick={async () => {
                if (!confirmDeleteId) return;
                try {
                    const token = await getAuthToken();
                    await deleteProductApi(confirmDeleteId, token);
                    deleteProduct(confirmDeleteId);
                } catch (err) {
                    console.error('Error eliminando producto:', err);
                } finally {
                    setConfirmDeleteId(null);
                }
            }}
        />
        </div>
    );
};

export default ProductTable;
