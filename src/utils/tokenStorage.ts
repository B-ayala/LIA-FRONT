/**
 * Almacenamiento de tokens en localStorage.
 *
 * NOTA de seguridad: localStorage es vulnerable a XSS. Mitigaciones aplicadas:
 *  - Refresh tokens con rotación + detección de reuse en backend.
 *  - Access token corto (15 min).
 *  - Logout forzado tras "reuse" detectado.
 *
 * Si en el futuro se quiere reforzar, migrar el refresh token a httpOnly cookie
 * (requiere ajustar backend para set-cookie y CORS credentials).
 */

const ACCESS_KEY = 'db_access_token';
const REFRESH_KEY = 'db_refresh_token';
const USER_KEY = 'db_auth_user';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  emailConfirmed?: boolean;
}

const safeGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage full or disabled */
  }
};

const safeRemove = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
};

export const tokenStorage = {
  getAccessToken: (): string | null => safeGet(ACCESS_KEY),
  getRefreshToken: (): string | null => safeGet(REFRESH_KEY),
  getUser: (): StoredUser | null => {
    const raw = safeGet(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  },
  setTokens: (accessToken: string, refreshToken: string) => {
    safeSet(ACCESS_KEY, accessToken);
    safeSet(REFRESH_KEY, refreshToken);
  },
  setUser: (user: StoredUser) => safeSet(USER_KEY, JSON.stringify(user)),
  clear: () => {
    safeRemove(ACCESS_KEY);
    safeRemove(REFRESH_KEY);
    safeRemove(USER_KEY);
  },
};
