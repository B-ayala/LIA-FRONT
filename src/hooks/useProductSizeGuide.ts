import { useMemo } from 'react';
import { useSizeCatalog, type SizeCatalogStatus } from './useSizeCatalog';
import type { Product } from '../types/product';
import { getSizeVariant } from '../utils/productVariants';
import { resolveSizeGuide, usesGlobalSizes, type ResolvedSizeGuide } from '../utils/sizeGuideTable';

interface ProductSizeGuide {
  guide: ResolvedSizeGuide;
  /** `idle` = el producto no usa talles globales: no hace falta el catálogo. */
  status: SizeCatalogStatus;
  error: string;
  reload: () => void;
  /** Mostrar el botón "Ver guía de talles": hay algo que ver (o falló la carga y se puede reintentar). */
  hasGuide: boolean;
}

/** Guía de talles de un producto, resolviendo las medidas de los talles globales desde el catálogo. */
export const useProductSizeGuide = (product: Product): ProductSizeGuide => {
  const sizeVariant = useMemo(() => getSizeVariant(product), [product]);
  const needsCatalog = usesGlobalSizes(sizeVariant);
  const catalog = useSizeCatalog(needsCatalog);

  const guide = useMemo(
    () => resolveSizeGuide(sizeVariant, product.sizeGuide, catalog.byId),
    [sizeVariant, product.sizeGuide, catalog.byId],
  );

  const hasGuide = catalog.status !== 'loading' && (guide.kind !== 'none' || catalog.status === 'error');
  return { guide, status: catalog.status, error: catalog.error, reload: catalog.reload, hasGuide };
};
