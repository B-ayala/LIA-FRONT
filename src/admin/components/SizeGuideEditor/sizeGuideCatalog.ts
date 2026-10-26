import type { useSizeCatalog } from '../../../hooks/useSizeCatalog';

/** Lo que el editor de guía necesita del catálogo global de talles. */
export type SizeGuideCatalog = Pick<ReturnType<typeof useSizeCatalog>, 'status' | 'sizes' | 'error' | 'reload'>;
