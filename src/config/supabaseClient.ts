import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken } from '../services/sessionRefresh';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase URL y Anon Key son requeridos. Verifica tu archivo .env'
  );
}

const POSTGREST_PATH = '/rest/v1/';

// supabase-js ya no guarda sesión (persistSession: false): el access token vive solo
// en memoria (authTokenStore) y se inyecta acá en las consultas a la base, para que
// RLS siga viendo al usuario logueado sin que el token toque localStorage.
const authenticatedFetch: typeof fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (!url.includes(POSTGREST_PATH)) return fetch(input, init);

  const token = await getValidAccessToken();
  if (!token) return fetch(input, init);

  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: authenticatedFetch },
});
