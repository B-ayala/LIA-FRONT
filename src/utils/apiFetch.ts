/**
 * Wrapper de fetch con interceptor de auth.
 *
 * Comportamiento:
 *  - Adjunta automáticamente el access token (Bearer) tomándolo de la sesión de
 *    Supabase, que se auto-refresca. `tokenStorage` se mantiene sincronizado para
 *    el estado de login de la UI (authStore).
 *  - Si una request protegida devuelve 401, refresca la sesión vía Supabase y
 *    reintenta una sola vez. Si el refresh falla, limpia sesión y emite `auth:logout`.
 *  - Cola de refresh: si llegan N requests con token expirado en paralelo,
 *    todas esperan al mismo refresh en lugar de dispararlo N veces.
 *  - Un 503 `AUTH_UNAVAILABLE` (Supabase/BD lentos) NO es un token inválido: no se
 *    refresca ni se desloguea. Se reintenta 1 vez tras `Retry-After` (máx 2s) y, si
 *    persiste, se devuelve el 503 con un mensaje humano en `message`.
 *  - Mantiene el header `ngrok-skip-browser-warning` para túneles de ngrok.
 */

import { supabase } from '../config/supabaseClient';
import { tokenStorage } from './tokenStorage';

const LOCALHOST_API = 'http://localhost:3000/api';
const configuredBase: string = import.meta.env.VITE_API_URL_LOCAL ?? LOCALHOST_API;

// Si falta la variable en un deploy, el front apuntaría a localhost del navegador del usuario sin avisar.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL_LOCAL) {
  console.error('VITE_API_URL_LOCAL no está definida: las llamadas al backend irán a localhost.');
}

/** URL base del backend propio. Única fuente de verdad para services y componentes. */
export const API_BASE_URL = configuredBase;

export const AUTH_LOGOUT_EVENT = 'auth:logout';

export const AUTH_UNAVAILABLE_CODE = 'AUTH_UNAVAILABLE';
export const AUTH_UNAVAILABLE_MESSAGE = 'El servicio está lento, reintentá en unos segundos.';
const MAX_RETRY_AFTER_MS = 2000;
const DEFAULT_RETRY_AFTER_MS = 1000;
const HTTP_SERVICE_UNAVAILABLE = 503;

export const authHeaders = (token: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

const dispatchLogout = (reason: string) => {
  tokenStorage.clear();
  try {
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT, { detail: { reason } }));
  } catch { /* noop */ }
};

// Sincroniza tokenStorage con la sesión de Supabase (para el estado de login de la UI).
const syncSessionToStorage = (session: { access_token: string; refresh_token: string } | null) => {
  if (session) tokenStorage.setTokens(session.access_token, session.refresh_token);
};

// Devuelve un access token fresco desde Supabase (auto-refresca si expiró).
// Fallback a tokenStorage por si la sesión de Supabase no está disponible.
const getFreshAccessToken = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      syncSessionToStorage(data.session);
      return data.session.access_token;
    }
  } catch {
    /* fall through al fallback */
  }
  return tokenStorage.getAccessToken();
};

// ─── Cola de refresh (evita refresh múltiples concurrentes) ───
let refreshInflight: Promise<string | null> | null = null;

const performRefresh = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      dispatchLogout('refresh_failed');
      return null;
    }
    syncSessionToStorage(data.session);
    return data.session.access_token;
  } catch {
    // Error de red durante refresh: no limpiamos sesión, dejamos que reintente más tarde
    return null;
  }
};

const refreshAccessToken = (): Promise<string | null> => {
  if (!refreshInflight) {
    refreshInflight = performRefresh().finally(() => {
      refreshInflight = null;
    });
  }
  return refreshInflight;
};

// ─── 503 AUTH_UNAVAILABLE ───

const isAuthUnavailable = async (response: Response): Promise<boolean> => {
  if (response.status !== HTTP_SERVICE_UNAVAILABLE) return false;
  const body = await response.clone().json().catch(() => null) as { code?: string } | null;
  return body?.code === AUTH_UNAVAILABLE_CODE;
};

const parseRetryAfterMs = (response: Response): number => {
  const seconds = Number(response.headers.get('Retry-After'));
  if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_RETRY_AFTER_MS;
  return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Mismo 503, pero con mensaje humano: los callers ya muestran `message` de errores !ok.
const withHumanMessage = (original: Response): Response => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const retryAfter = original.headers.get('Retry-After');
  if (retryAfter) headers.set('Retry-After', retryAfter);
  return new Response(
    JSON.stringify({ code: AUTH_UNAVAILABLE_CODE, message: AUTH_UNAVAILABLE_MESSAGE }),
    { status: HTTP_SERVICE_UNAVAILABLE, headers },
  );
};

// Reintenta 1 vez tras Retry-After. Nunca toca la sesión: el 503 no dice nada del token.
const retryIfUnavailable = async (response: Response, retry: () => Promise<Response>): Promise<Response> => {
  if (!(await isAuthUnavailable(response))) return response;
  await wait(parseRetryAfterMs(response));
  const second = await retry();
  return (await isAuthUnavailable(second)) ? withHumanMessage(second) : second;
};

// ─── apiFetch principal ───

interface ApiFetchOptions extends RequestInit {
  /** Si true, no agrega Authorization (útil para login/register/refresh públicos). */
  skipAuth?: boolean;
}

const buildHeaders = (init: ApiFetchOptions | undefined, token: string | null, targetHost: string): Headers => {
  const headers = new Headers(init?.headers);
  const isNgrokHost = targetHost.endsWith('.ngrok-free.app') || targetHost.endsWith('.ngrok-free.dev');
  if (isNgrokHost) headers.set('ngrok-skip-browser-warning', 'true');

  if (!init?.skipAuth && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

export const apiFetch = async (input: RequestInfo | URL, init?: ApiFetchOptions): Promise<Response> => {
  const rawUrl = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  const targetHost = new URL(rawUrl, window.location.origin).hostname;
  const isNgrokHost = targetHost.endsWith('.ngrok-free.app') || targetHost.endsWith('.ngrok-free.dev');

  const doFetch = async (token: string | null): Promise<Response> => {
    const headers = buildHeaders(init, token, targetHost);
    return fetch(input, { ...init, headers });
  };

  const accessToken = init?.skipAuth ? null : await getFreshAccessToken();

  let response: Response;
  try {
    response = await doFetch(accessToken);
  } catch (err) {
    // Error de red — fallback a localhost si era ngrok
    if (isNgrokHost && rawUrl.startsWith(configuredBase)) {
      const fallbackUrl = LOCALHOST_API + rawUrl.slice(configuredBase.length);
      response = await fetch(fallbackUrl, {
        ...init,
        headers: buildHeaders(init, accessToken, new URL(fallbackUrl).hostname),
      });
    } else {
      throw err;
    }
  }

  // Endpoints públicos (skipAuth) o sin token: devolver tal cual.
  // 401 = token ausente/inválido/expirado → intentamos refrescar; 403 (sin permisos)
  // no se toca, lo maneja quien llama.
  if (init?.skipAuth || !accessToken || response.status !== 401) {
    return retryIfUnavailable(response, () => doFetch(accessToken));
  }

  // Token rechazado: refrescar vía Supabase (con cola) y reintentar 1 vez.
  const newToken = await refreshAccessToken();
  if (!newToken) return response;

  return retryIfUnavailable(await doFetch(newToken), () => doFetch(newToken));
};
