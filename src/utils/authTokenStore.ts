/**
 * Sesión en memoria.
 *
 * El access token y el usuario viven SOLO en variables del módulo: nunca en
 * localStorage/sessionStorage, así un XSS no puede leerlos del almacenamiento.
 * El refresh token ni siquiera llega a JS: está en una cookie httpOnly que
 * maneja el backend (`/api/auth/*`). Al recargar la pestaña la sesión se
 * recupera pidiéndole un access token nuevo a esa cookie (ver sessionRefresh).
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  emailConfirmed?: boolean;
}

// Flag de sessionStorage (no es un secreto): se limpia en clear() para que un
// logout + nuevo login cuente como sesión nueva y el cartel pueda volver a mostrarse.
export const WELCOME_ANNOUNCEMENT_SESSION_KEY = 'welcome-announcement-shown';

// Claves de versiones anteriores que guardaban tokens en localStorage: se purgan
// para que los usuarios existentes no conserven credenciales legibles por JS.
const LEGACY_STORAGE_KEYS = ['db_access_token', 'db_refresh_token', 'db_auth_user'];
const LEGACY_SUPABASE_KEY_PATTERN = /^sb-.*-auth-token/;

const MS_PER_SECOND = 1000;

interface MemorySession {
  accessToken: string;
  expiresAtMs: number;
  user: AuthUser;
}

let session: MemorySession | null = null;

export const authTokenStore = {
  getAccessToken: (): string | null => session?.accessToken ?? null,
  getExpiresAtMs: (): number => session?.expiresAtMs ?? 0,
  getUser: (): AuthUser | null => session?.user ?? null,
  setSession: (accessToken: string, expiresInSeconds: number, user: AuthUser) => {
    session = { accessToken, expiresAtMs: Date.now() + expiresInSeconds * MS_PER_SECOND, user };
  },
  clear: () => {
    session = null;
    try {
      window.sessionStorage.removeItem(WELCOME_ANNOUNCEMENT_SESSION_KEY);
    } catch {
      /* sessionStorage deshabilitado: no hay nada que limpiar */
    }
  },
};

export const purgeLegacyStoredSession = (): void => {
  try {
    const keys = Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i));
    keys
      .filter((key): key is string => key !== null)
      .filter((key) => LEGACY_STORAGE_KEYS.includes(key) || LEGACY_SUPABASE_KEY_PATTERN.test(key))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* localStorage deshabilitado: no hay nada que purgar */
  }
};
