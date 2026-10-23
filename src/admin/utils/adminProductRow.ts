import type { AdminProduct } from '../store/adminStore';
import { getProductStockFromVariants } from '../../utils/productVariants';
import { parseProductCardOptions } from '../../utils/productCardOptions';
import { cleanText, normalizeCategory } from '../../utils/formatters';

/** Fila de `productos` (Supabase) → modelo del admin. Compartido por el listado y la edición. */
export const mapAdminProductRow = (p: Record<string, unknown>): AdminProduct => ({
  id: String(p.id),
  name: cleanText(p.name as string),
  price: p.price as number,
  originalPrice: (p.original_price as number) || undefined,
  // Si el producto trackea stock por talle, la suma de variantes es la fuente de
  // verdad (igual que la tienda pública). La columna `stock` puede quedar
  // desincronizada; sólo se usa como fallback para productos sin talles.
  stock: getProductStockFromVariants(p.variants as AdminProduct['variants']) ?? (p.stock as number),
  category: normalizeCategory(p.category as string),
  imageUrl: (p.image_url as string) || '',
  images: (p.images as string[]) || undefined,
  description: (p.description as string) || undefined,
  discount: (p.discount as number) || undefined,
  condition: (p.condition as 'new' | 'used') || 'new',
  freeShipping: (p.free_shipping as boolean) || false,
  hoverImageEnabled: (p.hover_image_enabled as boolean) ?? true,
  cardOptions: parseProductCardOptions(p.card_options),
  variants: (p.variants as AdminProduct['variants']) || undefined,
  specifications: (p.specifications as AdminProduct['specifications']) || undefined,
  features: (p.features as string[]) || undefined,
  faqs: (p.faqs as AdminProduct['faqs']) || undefined,
  sizeGuide: (p.size_guide as AdminProduct['sizeGuide']) || undefined,
  warranty: (p.warranty as string) || undefined,
  returnPolicy: (p.return_policy as string) || undefined,
  status: (p.status as 'active' | 'inactive') || 'active',
  featured: (p.featured as boolean) || false,
  // Se guarda el string crudo: convertirlo con new Date() perdería los microsegundos y el
  // backend lo compara por igualdad exacta.
  updatedAt: typeof p.updated_at === 'string' ? p.updated_at : undefined,
});
