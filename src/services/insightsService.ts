import { apiFetch, API_BASE_URL } from '../utils/apiFetch';
import type { Insight, InsightResponse } from '../admin/components/Assistant/assistant.types';

/**
 * Cliente de los endpoints de analítica del asistente admin.
 * Cada llamada va con el Bearer del admin (lo agrega apiFetch) y espera el
 * envelope { success, insight }. Lanza un Error con mensaje humano si falla.
 */
const INSIGHTS_BASE = `${API_BASE_URL}/admin/insights`;

const GENERIC_ERROR = 'No pudimos obtener la información. Reintentá en unos segundos.';

export async function fetchInsight(endpoint: string): Promise<Insight> {
  let response: Response;
  try {
    response = await apiFetch(`${INSIGHTS_BASE}/${endpoint}`);
  } catch {
    throw new Error('Sin conexión con el servidor. Revisá tu red e intentá de nuevo.');
  }

  const data = (await response.json().catch(() => null)) as InsightResponse | null;

  if (response.status === 403) {
    throw new Error('Tu sesión no tiene permisos de administrador para esta consulta.');
  }
  if (!response.ok || !data?.success || !data.insight) {
    throw new Error(data?.message || GENERIC_ERROR);
  }
  return data.insight;
}
