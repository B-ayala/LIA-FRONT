/**
 * Helper para obtener el access token actual.
 *
 * Toma el token de la sesión de Supabase (que se auto-refresca), con fallback a
 * `tokenStorage`. Úsalo cuando necesites el token fuera de `apiFetch` (ej. uploads
 * directos a Cloudinary); para llamadas a la API preferí `apiFetch`, que ya lo adjunta.
 */

import { supabase } from '../config/supabaseClient';
import { tokenStorage } from './tokenStorage';

export const getAuthToken = async (): Promise<string> => {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      tokenStorage.setTokens(data.session.access_token, data.session.refresh_token);
      return data.session.access_token;
    }
  } catch {
    /* fallback a tokenStorage */
  }
  const token = tokenStorage.getAccessToken();
  if (!token) throw new Error('Token no disponible');
  return token;
};
