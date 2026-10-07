import type { AdminProduct } from '../../store/adminStore';

// Lo que el formulario produce antes de persistir: se previsualiza y recién
// se guarda al confirmar. `featured` no se edita desde el formulario.
export type ProductDraft = Omit<AdminProduct, 'id' | 'featured'>;

// State de navegación entre el modal y la vista previa (viaja en history.state,
// así sobrevive a un refresh de la vista previa).
export interface ProductPreviewState {
  draft: ProductDraft;
  /** null = producto nuevo (se crea al confirmar). */
  productId: string | null;
}
