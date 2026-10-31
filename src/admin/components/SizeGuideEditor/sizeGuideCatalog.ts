import type { useSizeCatalog } from '../../../hooks/useSizeCatalog';

/** Lo que el editor de guía necesita del catálogo global de talles. */
export type SizeGuideCatalog = Pick<ReturnType<typeof useSizeCatalog>, 'status' | 'sizes' | 'error' | 'reload'>;

/** Página de lo general de la guía (cómo medirse, aclaraciones y modelo). */
export const GLOBAL_GUIDE_PATH = '/admin/sizes/guia';
