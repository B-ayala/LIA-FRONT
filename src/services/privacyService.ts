import { getSiteContent } from './siteContentService';
import { DEFAULT_PRIVACY_BODY } from '../users/pages/legal/defaultPrivacy';

/** Clave de `site_content` donde el admin publica la Política de privacidad. */
export const PRIVACY_CONTENT_KEY = 'legal_privacy';

export interface PrivacyContent {
  body: string;
}

export const DEFAULT_PRIVACY: PrivacyContent = { body: DEFAULT_PRIVACY_BODY };

/** Texto publicado por el admin; si no hay o está vacío, el de por defecto. */
export const normalizePrivacyContent = (value: unknown): PrivacyContent => {
  if (!value || typeof value !== 'object') return DEFAULT_PRIVACY;
  const body = (value as Record<string, unknown>).body;
  return typeof body === 'string' && body.trim() ? { body: body.trim() } : DEFAULT_PRIVACY;
};

export const getPrivacyContent = async (): Promise<PrivacyContent> =>
  normalizePrivacyContent(await getSiteContent<unknown>(PRIVACY_CONTENT_KEY));
