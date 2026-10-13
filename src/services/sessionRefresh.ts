/**
 * Renovación de sesión contra el backend (`POST /api/auth/refresh`).
 *
 * La cookie httpOnly del refresh token viaja sola (`credentials: 'include'`);
 * la respuesta trae un access token nuevo que se guarda solo en memoria.
 * Una única request en vuelo: N llamadas con token vencido comparten el mismo refresh.
 */

import { API_BASE_URL } from '../config/apiBaseUrl';
import { authTokenStore, type AuthUser } from '../utils/authTokenStore';

const EXPIRY_MARGIN_MS = 60_000;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;

export type RefreshResult =
  | { status: 'ok'; user: AuthUser; accessToken: string }
  | { status: 'expired' }
  | { status: 'unavailable' };

interface SessionPayload {
  user: Omit<AuthUser, 'emailConfirmed'>;
  accessToken: string;
  expiresIn: number;
}

export const storeSessionPayload = (payload: SessionPayload): AuthUser => {
  // Un login/refresh exitoso del backend implica cuenta confirmada.
  const user: AuthUser = { ...payload.user, emailConfirmed: true };
  authTokenStore.setSession(payload.accessToken, payload.expiresIn, user);
  return user;
};

const requestRefresh = async (): Promise<RefreshResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (response.status === HTTP_UNAUTHORIZED || response.status === HTTP_FORBIDDEN) {
      authTokenStore.clear();
      return { status: 'expired' };
    }
    if (!response.ok) return { status: 'unavailable' };

    const body = (await response.json()) as { data: SessionPayload };
    const user = storeSessionPayload(body.data);
    return { status: 'ok', user, accessToken: body.data.accessToken };
  } catch {
    // Red caída o backend dormido: no es una sesión inválida, no cerramos nada.
    return { status: 'unavailable' };
  }
};

let refreshInflight: Promise<RefreshResult> | null = null;

export const refreshSession = (): Promise<RefreshResult> => {
  if (!refreshInflight) {
    refreshInflight = requestRefresh().finally(() => {
      refreshInflight = null;
    });
  }
  return refreshInflight;
};

/**
 * Access token vigente o null si no hay sesión. Renueva si falta menos de un
 * minuto para que venza; si la renovación no está disponible devuelve el actual
 * mientras todavía no haya vencido.
 */
export const getValidAccessToken = async (): Promise<string | null> => {
  const token = authTokenStore.getAccessToken();
  if (!token) return null;
  if (authTokenStore.getExpiresAtMs() - Date.now() > EXPIRY_MARGIN_MS) return token;

  const result = await refreshSession();
  if (result.status === 'ok') return result.accessToken;
  if (result.status === 'unavailable' && authTokenStore.getExpiresAtMs() > Date.now()) return token;
  return null;
};
