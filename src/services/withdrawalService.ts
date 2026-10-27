import { apiFetch, API_BASE_URL } from '../utils/apiFetch';
import { timeoutSignal } from '../utils/withTimeout';

const WITHDRAWALS_URL = `${API_BASE_URL}/withdrawals`;
const REQUEST_TIMEOUT_MS = 15_000;
const HTTP_TOO_MANY_REQUESTS = 429;

export const WITHDRAWAL_STATUSES = ['recibida', 'en_gestion', 'resuelta', 'rechazada'] as const;
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export const WITHDRAWAL_STATUS_LABEL: Record<WithdrawalStatus, string> = {
  recibida: 'Recibida',
  en_gestion: 'En gestión',
  resuelta: 'Resuelta',
  rechazada: 'Rechazada',
};

export interface WithdrawalPayload {
  name: string;
  email: string;
  description: string;
  orderNumber?: number;
}

export interface WithdrawalReceipt {
  code: string;
  receivedAt: string;
}

export interface WithdrawalLinkedPurchase {
  id: string;
  order_number: number | null;
  product_name: string;
  total_price: number;
}

export interface Withdrawal {
  id: string;
  code: string;
  name: string;
  email: string;
  description: string;
  order_number: number | null;
  status: WithdrawalStatus;
  needs_review: boolean;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  purchases: WithdrawalLinkedPurchase[];
}

export interface WithdrawalsPage {
  rows: Withdrawal[];
  total: number;
}

interface ErrorBody {
  message?: unknown;
}

const RATE_LIMIT_MESSAGE = 'Hiciste varios intentos seguidos. Esperá unos minutos y volvé a intentar.';
const SEND_ERROR_MESSAGE = 'No pudimos registrar tu solicitud. Reintentá en unos segundos o escribinos por WhatsApp.';

const readMessage = async (res: Response, fallback: string): Promise<string> => {
  const body = (await res.json().catch(() => null)) as ErrorBody | null;
  return typeof body?.message === 'string' && body.message !== '' ? body.message : fallback;
};

/** Registra una solicitud de arrepentimiento (endpoint público, sin sesión). */
export const createWithdrawal = async (
  payload: WithdrawalPayload,
  signal?: AbortSignal,
): Promise<WithdrawalReceipt> => {
  const res = await fetch(WITHDRAWALS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: signal ?? timeoutSignal(REQUEST_TIMEOUT_MS),
  });

  if (res.status === HTTP_TOO_MANY_REQUESTS) throw new Error(RATE_LIMIT_MESSAGE);
  if (!res.ok) throw new Error(await readMessage(res, SEND_ERROR_MESSAGE));

  const data = (await res.json().catch(() => null)) as { code?: unknown; receivedAt?: unknown } | null;
  if (typeof data?.code !== 'string' || data.code === '') throw new Error(SEND_ERROR_MESSAGE);

  return { code: data.code, receivedAt: typeof data.receivedAt === 'string' ? data.receivedAt : '' };
};

interface WithdrawalsListBody {
  data?: Withdrawal[];
  total?: number;
}

export interface WithdrawalsQuery {
  status?: WithdrawalStatus | '';
  limit: number;
  offset: number;
}

/** Lista paginada (limit/offset) para el panel admin. */
export const getWithdrawals = async (query: WithdrawalsQuery, signal?: AbortSignal): Promise<WithdrawalsPage> => {
  const params = new URLSearchParams({ limit: String(query.limit), offset: String(query.offset) });
  if (query.status) params.set('status', query.status);

  const res = await apiFetch(`${WITHDRAWALS_URL}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(await readMessage(res, 'No pudimos cargar los arrepentimientos.'));

  const body = (await res.json().catch(() => null)) as WithdrawalsListBody | null;
  const rows = body?.data ?? [];
  return { rows, total: typeof body?.total === 'number' ? body.total : rows.length };
};

export interface WithdrawalUpdate {
  status: WithdrawalStatus;
  adminNote: string;
}

export const updateWithdrawal = async (id: string, update: WithdrawalUpdate): Promise<void> => {
  const res = await apiFetch(`${WITHDRAWALS_URL}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
    signal: timeoutSignal(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(await readMessage(res, 'No pudimos guardar los cambios. Reintentá.'));
};
