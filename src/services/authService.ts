/**
 * Auth service.
 *
 * Login, refresh y logout pasan por el backend (`/api/auth/*`): el refresh token
 * queda en una cookie httpOnly (nunca lo lee JS) y el access token solo en memoria
 * (authTokenStore). Así el rate limit y el bloqueo por fuerza bruta del backend no
 * se pueden saltear, y un XSS no puede robar la sesión del almacenamiento.
 * Registro, confirmación de email y recuperación de contraseña siguen contra Supabase Auth.
 */

import type { User, EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '../config/supabaseClient';
import { API_BASE_URL } from '../config/apiBaseUrl';
import { authTokenStore, type AuthUser } from '../utils/authTokenStore';
import { getValidAccessToken, refreshSession, storeSessionPayload } from './sessionRefresh';

export type { AuthUser };

export interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  captchaToken?: string;
}

interface RegisterResult {
  success: boolean;
  autoConfirmed: boolean;
  data?: AuthUser;
}

type SupabaseAuthMeta = { name?: string; phone?: string };
type CodedError = Error & { code?: string };
type SessionPayload = Parameters<typeof storeSessionPayload>[0];
interface AuthErrorBody {
  code?: string;
  message?: string;
  data?: SessionPayload;
}

const HTTP_UNAUTHORIZED = 401;
const HTTP_TOO_MANY_REQUESTS = 429;
const INVALID_CREDENTIALS_MESSAGE = 'Email o contraseña incorrectos.';
const GENERIC_LOGIN_ERROR = 'No pudimos iniciar sesión. Intentá de nuevo en unos minutos.';
const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Volvé a iniciar sesión.';

// Construye la URL de redirección de los emails respetando el base path del deploy
// (p. ej. `/LIA/` en GitHub Pages) — Supabase debe tenerla en su allowlist de redirects.
const redirectUrl = (path: string): string => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}${path}`;
};

const codedError = (message: string, code?: string): CodedError => {
  const err = new Error(message) as CodedError;
  if (code) err.code = code;
  return err;
};

const buildAuthUser = (user: User): AuthUser => {
  const meta = (user.user_metadata ?? {}) as SupabaseAuthMeta;
  return {
    id: user.id,
    name: meta.name ?? '',
    email: user.email ?? '',
    phone: meta.phone,
    role: 'user',
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
};

// ─── Register ───
export const register = async (payload: RegisterPayload): Promise<RegisterResult> => {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: { name: payload.name, phone: payload.phone },
      emailRedirectTo: redirectUrl('/auth/confirm'),
      captchaToken: payload.captchaToken,
    },
  });

  if (error) {
    const rateLimited = error.status === HTTP_TOO_MANY_REQUESTS || /rate limit/i.test(error.message);
    throw codedError(error.message, rateLimited ? 'RATE_LIMIT' : undefined);
  }

  // Supabase ofusca el caso "email ya registrado" devolviendo un user con identities vacío.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    throw codedError('Ese email ya está registrado.', 'EMAIL_ALREADY_CONFIRMED');
  }

  return {
    success: true,
    autoConfirmed: Boolean(data.session),
    data: data.user ? buildAuthUser(data.user) : undefined,
  };
};

// ─── Login ───
const friendlyLoginError = (status: number, body: AuthErrorBody | null): CodedError => {
  if (body?.code === 'EMAIL_NOT_CONFIRMED') {
    return codedError(
      'Tu cuenta todavía no está confirmada. Revisá tu correo (y la carpeta de spam) para activarla.',
      'EMAIL_NOT_CONFIRMED',
    );
  }
  if (status === HTTP_TOO_MANY_REQUESTS) {
    return codedError(body?.message ?? 'Demasiados intentos. Esperá un momento antes de reintentar.', body?.code ?? 'RATE_LIMIT');
  }
  if (body?.code === 'CAPTCHA_FAILED') return codedError(body.message ?? GENERIC_LOGIN_ERROR, 'CAPTCHA_FAILED');
  if (status === HTTP_UNAUTHORIZED) return codedError(INVALID_CREDENTIALS_MESSAGE, 'INVALID_CREDENTIALS');
  return codedError(GENERIC_LOGIN_ERROR, 'AUTH_ERROR');
};

export const login = async (email: string, password: string, captchaToken?: string): Promise<AuthUser> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, captchaToken }),
    });
  } catch {
    throw codedError(GENERIC_LOGIN_ERROR, 'AUTH_ERROR');
  }

  const body = (await response.json().catch(() => null)) as AuthErrorBody | null;
  if (!response.ok || !body?.data) throw friendlyLoginError(response.status, body);
  return storeSessionPayload(body.data);
};

// ─── Logout ───
export const logout = async (): Promise<void> => {
  try {
    const token = await getValidAccessToken();
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* no bloqueamos el logout local si el backend o la red fallan */
  } finally {
    authTokenStore.clear();
  }
};

// ─── Restauración de sesión ───
// Se llama al cargar la app con la cookie del backend. `null` = sin sesión (o backend no disponible).
export const restoreSession = async (): Promise<AuthUser | null> => {
  const result = await refreshSession();
  return result.status === 'ok' ? result.user : null;
};

export const me = async (): Promise<AuthUser | null> => authTokenStore.getUser() ?? restoreSession();

// ─── Email confirmation ───
export const confirmEmail = async (tokenHash: string, type: EmailOtpType = 'signup'): Promise<void> => {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) throw new Error(error.message);
};

// Pasa por el backend propio (no llama a Supabase directo) para que el límite
// de 3 intentos cada 24hs por email ([[emailActionLimiter]]) no se pueda
// eludir limpiando el estado del navegador.
const postPublicAuthAction = async (path: string, email: string, captchaToken?: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, captchaToken }),
  });
  const data = await res.json().catch(() => null);
  if (res.status === HTTP_TOO_MANY_REQUESTS) {
    throw codedError(data?.message ?? 'Alcanzaste el máximo de intentos.', 'MAX_ATTEMPTS_REACHED');
  }
  if (!res.ok) {
    throw codedError(data?.message ?? 'No se pudo completar la operación.');
  }
};

export const resendConfirmation = async (email: string, captchaToken?: string): Promise<void> => {
  await postPublicAuthAction('/auth/resend-confirmation', email, captchaToken);
};

export const hasActiveSession = async (): Promise<boolean> => {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
};

// El link de recuperación dispara el evento PASSWORD_RECOVERY (puede llegar después
// del montaje del componente). Devuelve una función para desuscribirse.
export const onPasswordRecovery = (callback: () => void): (() => void) => {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') callback();
  });
  return () => data.subscription.unsubscribe();
};

// ─── Forgot / Reset password ───
export const forgotPassword = async (email: string, captchaToken?: string): Promise<void> => {
  await postPublicAuthAction('/auth/forgot-password', email, captchaToken);
};

// El link de recuperación de Supabase establece una sesión temporal (evento
// PASSWORD_RECOVERY). Con esa sesión activa, updateUser cambia la contraseña.
export const resetPassword = async (newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  await supabase.auth.signOut({ scope: 'local' });
  authTokenStore.clear();
};

// ─── Change password (logueado) ───
const SUPABASE_USER_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`;

const updatePasswordWithToken = async (accessToken: string, newPassword: string): Promise<void> => {
  const response = await fetch(SUPABASE_USER_ENDPOINT, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ password: newPassword }),
  });
  if (response.ok) return;
  const body = (await response.json().catch(() => null)) as { msg?: string; message?: string } | null;
  throw new Error(body?.msg ?? body?.message ?? 'No pudimos actualizar la contraseña.');
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  captchaToken?: string,
): Promise<void> => {
  const current = authTokenStore.getUser();
  if (!current?.email) throw codedError(SESSION_EXPIRED_MESSAGE, 'AUTH_ERROR');

  // Supabase no valida la contraseña actual al cambiarla: re-autenticamos por el
  // backend (con su bloqueo por fuerza bruta) para hacerlo.
  try {
    await login(current.email, currentPassword, captchaToken);
  } catch (err) {
    if ((err as CodedError).code === 'INVALID_CREDENTIALS') {
      throw codedError('La contraseña actual es incorrecta', 'INVALID_CURRENT_PASSWORD');
    }
    throw err;
  }

  const token = await getValidAccessToken();
  if (!token) throw codedError(SESSION_EXPIRED_MESSAGE, 'AUTH_ERROR');
  await updatePasswordWithToken(token, newPassword);

  // Forzamos re-login con la nueva contraseña.
  await logout();
};
