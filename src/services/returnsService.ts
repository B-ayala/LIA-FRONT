import { getSiteContent } from './siteContentService';
import { DEFAULT_RETURNS_BODY } from '../users/pages/legal/defaultReturns';

/** Clave de `site_content` donde el admin publica "Cambios y devoluciones". */
export const RETURNS_CONTENT_KEY = 'legal_returns';

export interface ReturnsContent {
  body: string;
}

export const DEFAULT_RETURNS: ReturnsContent = { body: DEFAULT_RETURNS_BODY };

/** Texto publicado por el admin; si no hay o está vacío, el de por defecto. */
export const normalizeReturnsContent = (value: unknown): ReturnsContent => {
  if (!value || typeof value !== 'object') return DEFAULT_RETURNS;
  const body = (value as Record<string, unknown>).body;
  return typeof body === 'string' && body.trim() ? { body: body.trim() } : DEFAULT_RETURNS;
};

export const getReturnsContent = async (): Promise<ReturnsContent> =>
  normalizeReturnsContent(await getSiteContent<unknown>(RETURNS_CONTENT_KEY));
