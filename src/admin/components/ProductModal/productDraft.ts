import type { AdminProduct } from '../../store/adminStore';
import type { Variant } from '../../../types/product';
import { getProductStockFromVariants, isSizeVariant } from '../../../utils/productVariants';

// Lo que el formulario produce antes de persistir: se previsualiza y recién
// se guarda al confirmar. `featured` no se edita desde el formulario.
// `stock` undefined = el formulario no lo gestiona (producto sin stock por talle al editar):
// no se envía y el backend conserva el valor actual, que se muestra en `unmanagedStock`.
export type ProductDraft = Omit<AdminProduct, 'id' | 'featured' | 'stock'> & {
  stock?: number;
  unmanagedStock?: number;
};

// State de navegación entre el modal y la vista previa (viaja en history.state,
// así sobrevive a un refresh de la vista previa).
export interface ProductPreviewState {
  draft: ProductDraft;
  /** null = producto nuevo (se crea al confirmar). */
  productId: string | null;
}

const mergeSizeStock = (draftVariant: Variant, freshVariant: Variant | undefined): Variant => {
  if (!draftVariant.stockByOption || !freshVariant?.stockByOption) return draftVariant;
  const freshStock = freshVariant.stockByOption;
  const stockByOption = Object.fromEntries(
    Object.entries(draftVariant.stockByOption).map(([option, stock]) => [option, freshStock[option] ?? stock]),
  );
  return { ...draftVariant, stockByOption };
};

/**
 * Ante un 409 PRODUCT_CHANGED se conserva lo que escribió el admin, salvo el stock por talle:
 * ese es el dato que cambia solo (ventas) y pisarlo con el del borrador revendería unidades.
 * Talles nuevos del borrador (que no existen en la base) conservan el valor tipeado.
 */
export const rebaseDraftOnFresh = (draft: ProductDraft, fresh: AdminProduct): ProductDraft => {
  const freshSize = fresh.variants?.find((variant) => isSizeVariant(variant.name));
  const variants = draft.variants?.map((variant) => (isSizeVariant(variant.name) ? mergeSizeStock(variant, freshSize) : variant));
  return {
    ...draft,
    variants,
    stock: draft.stock === undefined ? undefined : getProductStockFromVariants(variants) ?? draft.stock,
    unmanagedStock: draft.stock === undefined ? fresh.stock : draft.unmanagedStock,
    updatedAt: fresh.updatedAt,
  };
};
