import { apiFetch, API_BASE_URL } from '../utils/apiFetch';
import { createCachedFetcher } from '../utils/createCachedFetcher';
import type { Size, SizeInput, SizeUpdate } from '../types/size';

const SIZES_URL = `${API_BASE_URL}/sizes`;
// El catálogo cambia poco; las mutaciones invalidan la caché de esta pestaña.
const SIZES_CACHE_TTL_MS = 5 * 60 * 1000;
const HTTP_CONFLICT = 409;

const SIZE_DUPLICATE_CODE = 'SIZE_DUPLICATE';
export const SIZE_DUPLICATE_MESSAGE = 'Ya existe un talle con ese nombre en esa categoría.';

interface ApiErrorBody {
  code?: string;
  message?: string;
}

const toErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  if (response.status === HTTP_CONFLICT && body.code === SIZE_DUPLICATE_CODE) return SIZE_DUPLICATE_MESSAGE;
  return body.message || fallback;
};

const fetchSizes = async (): Promise<Size[]> => {
  const response = await apiFetch(SIZES_URL, { skipAuth: true });
  if (!response.ok) throw new Error(await toErrorMessage(response, 'No pudimos cargar los talles.'));
  const body = (await response.json()) as { data?: Size[] };
  return body.data ?? [];
};

const sizesCache = createCachedFetcher(fetchSizes, SIZES_CACHE_TTL_MS);

/** Todos los talles del catálogo (activos e inactivos). `force` ignora la caché. */
export const listSizes = (options?: { force?: boolean }): Promise<Size[]> => {
  if (options?.force) sizesCache.invalidate();
  return sizesCache.load();
};

const sendSize = async (url: string, method: 'POST' | 'PUT', payload: SizeInput | SizeUpdate, fallback: string): Promise<Size> => {
  const response = await apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await toErrorMessage(response, fallback));
  sizesCache.invalidate();
  const body = (await response.json()) as { data: Size };
  return body.data;
};

export const createSize = (payload: SizeInput): Promise<Size> =>
  sendSize(SIZES_URL, 'POST', payload, 'No pudimos crear el talle. Reintentá.');

/** Edita o activa/desactiva (`active`). No existe borrado de talles. */
export const updateSize = (id: string, payload: SizeUpdate): Promise<Size> =>
  sendSize(`${SIZES_URL}/${encodeURIComponent(id)}`, 'PUT', payload, 'No pudimos guardar los cambios. Reintentá.');
