/**
 * Helper para obtener el access token actual.
 *
 * Úsalo cuando necesites el token fuera de `apiFetch` (ej. uploads directos a
 * Cloudinary); para llamadas a la API preferí `apiFetch`, que ya lo adjunta.
 */

import { getValidAccessToken } from '../services/sessionRefresh';

export const getAuthToken = async (): Promise<string> => {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Tu sesión expiró. Volvé a iniciar sesión para continuar.');
  return token;
};
