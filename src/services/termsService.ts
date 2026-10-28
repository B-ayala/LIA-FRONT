import { API_BASE_URL, apiFetch } from '../utils/apiFetch';
import { getSiteContent } from './siteContentService';
import { DEFAULT_TERMS_VERSION } from '../users/pages/legal/termsVersion';
import { DEFAULT_TERMS_BODY } from '../users/pages/legal/defaultTerms';

/** Clave de `site_content` donde el admin publica los Términos (la lee también el backend). */
export const TERMS_CONTENT_KEY = 'legal_terms';

const TERMS_VERSION_PATTERN = /^[\w.-]{1,40}$/;
const HTTP_CONFLICT = 409;

export interface TermsContent {
  version: string;
  body: string;
}

export interface TermsStatus {
  currentVersion: string;
  accepted: boolean;
}

export const DEFAULT_TERMS: TermsContent = { version: DEFAULT_TERMS_VERSION, body: DEFAULT_TERMS_BODY };

/** Términos publicados por el admin; si no hay o están mal formados, los de por defecto. */
export const normalizeTermsContent = (value: unknown): TermsContent => {
  if (!value || typeof value !== 'object') return DEFAULT_TERMS;
  const raw = value as Record<string, unknown>;
  const body = typeof raw.body === 'string' ? raw.body.trim() : '';
  const version = typeof raw.version === 'string' && TERMS_VERSION_PATTERN.test(raw.version)
    ? raw.version
    : DEFAULT_TERMS_VERSION;
  return body ? { version, body } : DEFAULT_TERMS;
};

export const getTermsContent = async (): Promise<TermsContent> =>
  normalizeTermsContent(await getSiteContent<unknown>(TERMS_CONTENT_KEY));

/** Error de aceptación con la versión que rige ahora (cuando los términos cambiaron en el medio). */
export class TermsVersionOutdatedError extends Error {
  readonly currentVersion: string;

  constructor(message: string, currentVersion: string) {
    super(message);
    this.currentVersion = currentVersion;
  }
}

const jsonHeaders = { 'Content-Type': 'application/json' };

/** ¿La cuenta logueada aceptó la versión vigente? La versión vigente la decide el backend. */
export const getTermsStatus = async (): Promise<TermsStatus> => {
  const res = await apiFetch(`${API_BASE_URL}/terms/status`);
  const data = await res.json().catch(() => null) as Partial<TermsStatus> | null;
  if (!res.ok || typeof data?.currentVersion !== 'string' || typeof data.accepted !== 'boolean') {
    throw new Error('No pudimos verificar los términos. Intentá de nuevo.');
  }
  return { currentVersion: data.currentVersion, accepted: data.accepted };
};

export const acceptTerms = async (termsVersion: string): Promise<void> => {
  const res = await apiFetch(`${API_BASE_URL}/terms/accept`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ termsVersion }),
  });
  if (res.ok) return;
  const data = await res.json().catch(() => null) as { message?: string; currentVersion?: string } | null;
  const message = data?.message ?? 'No pudimos registrar tu aceptación. Intentá de nuevo.';
  if (res.status === HTTP_CONFLICT && typeof data?.currentVersion === 'string') {
    throw new TermsVersionOutdatedError(message, data.currentVersion);
  }
  throw new Error(message);
};

/**
 * Deja constancia (con IP) de que la persona tildó los términos al registrarse. Es solo evidencia:
 * si falla no se bloquea el registro, porque la versión aceptada ya viaja en la cuenta.
 */
export const recordRegistrationAcceptance = async (email: string, termsVersion: string): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/terms/registration`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, termsVersion }),
    });
  } catch {
    /* evidencia accesoria: no se interrumpe el registro */
  }
};
