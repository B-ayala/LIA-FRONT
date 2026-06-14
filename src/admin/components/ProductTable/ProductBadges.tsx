import type { AdminProduct } from '../../store/adminStore';

interface ProductBadgesProps {
  product: AdminProduct;
  compact?: boolean;
}

export const StockBadge = ({ stock }: { stock: number }) => (
  <span className={`stock-badge ${stock === 0 ? 'out' : stock <= 5 ? 'low' : 'ok'}`}>
    {stock}
  </span>
);

export const StatusBadge = ({ status }: { status: string }) => (
  <span className={`status-badge ${status}`}>
    {status === 'active' ? 'Activo' : 'Inactivo'}
  </span>
);

export const ProductBadges = ({ product, compact = false }: ProductBadgesProps) => {
  if (compact) {
    return (
      <>
        <StockBadge stock={product.stock} />
        <StatusBadge status={product.status} />
      </>
    );
  }

  return (
    <>
      <div className="product-card-field">
        <span className="field-label">Stock</span>
        <StockBadge stock={product.stock} />
      </div>
      <div className="product-card-field">
        <span className="field-label">Estado</span>
        <StatusBadge status={product.status} />
      </div>
    </>
  );
};
