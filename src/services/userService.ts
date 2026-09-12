/**
 * userService — wrappers compatibles para componentes existentes (AuthModal, etc.).
 * Internamente delega al nuevo authService (JWT propio).
 */

import { apiFetch, API_BASE_URL } from '../utils/apiFetch';
import * as authService from './authService';

interface CreateUserPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt?: string;
}

const codeOf = (err: unknown): string | undefined =>
  err && typeof err === 'object' && 'code' in err
    ? ((err as { code?: string }).code)
    : undefined;

/**
 * Registrar nuevo usuario.
 * Lanza Error con messages convencionales que ya entiende el AuthModal:
 *   - 'EMAIL_ALREADY_CONFIRMED'
 *   - 'EMAIL_PENDING_CONFIRMATION'
 *   - 'SIGNUP_RATE_LIMIT:<seconds>:<count>'
 */
export const createUser = async (payload: CreateUserPayload): Promise<{ success: boolean; data?: User; message?: string }> => {
  try {
    const res = await authService.register(payload);
    if (res.autoConfirmed) {
      // En modo dev (EMAIL_PROVIDER=console) la cuenta queda confirmada al instante.
    }
    return {
      success: true,
      data: res.data
        ? { id: res.data.id, name: res.data.name, email: res.data.email, role: res.data.role }
        : undefined,
    };
  } catch (err) {
    const code = codeOf(err);
    const msg = err instanceof Error ? err.message : 'Error al registrar';
    if (code === 'EMAIL_ALREADY_CONFIRMED') throw new Error('EMAIL_ALREADY_CONFIRMED');
    if (code === 'EMAIL_PENDING_CONFIRMATION') throw new Error('EMAIL_PENDING_CONFIRMATION');
    if (code === 'RATE_LIMIT') throw new Error('SIGNUP_RATE_LIMIT:60:1');
    throw new Error(msg);
  }
};

interface LoginPayload {
  email: string;
  password: string;
}

export const loginUser = async (payload: LoginPayload): Promise<{ success: boolean; data?: User; message?: string }> => {
  try {
    const user = await authService.login(payload.email, payload.password);
    return {
      success: true,
      data: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    };
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Credenciales inválidas');
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const user = await authService.me();
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
};

export const logoutUser = async (): Promise<void> => {
  await authService.logout();
};

export const resendConfirmationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    await authService.resendConfirmation(email);
    return {
      success: true,
      message: `Si la cuenta existe y está pendiente, te reenviamos el email a ${email}. Revisá tu bandeja de entrada (y carpeta de spam).`,
    };
  } catch (err) {
    const code = codeOf(err);
    if (code === 'RATE_LIMIT') throw new Error('RESEND_COOLDOWN:60');
    throw new Error(err instanceof Error ? err.message : 'Error al reenviar el email');
  }
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    await authService.forgotPassword(email);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Error al enviar el email de recuperación');
  }
};

/**
 * Resetear contraseña desde el link de recuperación.
 * El link de Supabase establece una sesión temporal (PASSWORD_RECOVERY); con esa
 * sesión activa se aplica la nueva contraseña, sin necesidad de un token explícito.
 */
export const resetPassword = async (newPassword: string): Promise<void> => {
  try {
    await authService.resetPassword(newPassword);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Error al actualizar la contraseña');
  }
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  try {
    await authService.changePassword(currentPassword, newPassword);
  } catch (err) {
    const code = codeOf(err);
    if (code === 'INVALID_CURRENT_PASSWORD') throw new Error('La contraseña actual es incorrecta');
    throw new Error(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
  }
};

// ============================================================
// Admin API (CRUD usuarios) — sigue usando /api/users del backend
// ============================================================

export interface AdminUserData {
  id: string;
  name: string;
  phone?: string;
  email: string;
  role: string;
  created_at: string;
  email_confirmed_at: string | null;
  purchase_allowed_exclusive: boolean;
  is_owner: boolean;
}

export const getAdminUsers = async (): Promise<AdminUserData[]> => {
  const response = await apiFetch(`${API_BASE_URL}/users`);
  if (!response.ok) throw new Error('Error al conectar con el servidor');
  const data = await response.json();
  if (!data.success) throw new Error(data.message || 'Error al obtener usuarios');
  return data.data;
};

export const deleteAdminUser = async (userId: string): Promise<void> => {
  const response = await apiFetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
  // El status real no se pierde si el cuerpo no es JSON (ej. página de error del proxy)
  const data = await response.json().catch(() => ({
    success: false,
    message: `Error al eliminar usuario (HTTP ${response.status})`,
  }));
  if (!response.ok || !data.success) throw new Error(data.message || 'Error al eliminar usuario');
};

export const updateUserRole = async (userId: string, newRole: 'admin' | 'user'): Promise<AdminUserData> => {
  const response = await apiFetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: newRole }),
  });
  const data = await response.json().catch(() => ({
    success: false,
    message: `Error al actualizar usuario (HTTP ${response.status})`,
  }));
  if (!response.ok || !data.success) throw new Error(data.message || 'Error al actualizar el rol del usuario');
  return data.data;
};

/**
 * Marca/desmarca a un usuario como "comprador habilitado". Mientras haya al
 * menos un usuario marcado, el resto queda sin poder comprar (ver
 * orderController.js → blockIfPurchaseNotAllowed).
 */
export const updateUserPurchaseAccess = async (userId: string, allowed: boolean): Promise<AdminUserData> => {
  const response = await apiFetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchase_allowed_exclusive: allowed }),
  });
  const data = await response.json().catch(() => ({
    success: false,
    message: `Error al actualizar usuario (HTTP ${response.status})`,
  }));
  if (!response.ok || !data.success) throw new Error(data.message || 'Error al actualizar el permiso de compra del usuario');
  return data.data;
};
