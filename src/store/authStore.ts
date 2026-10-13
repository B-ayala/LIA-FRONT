import { create } from 'zustand';
import * as authService from '../services/authService';
import type { AuthUser } from '../utils/authTokenStore';

// ─── Authentication store ────────────────────────────────────────────────────
//
// Semántica de los dos flags (intencionalmente distintos):
//   `currentUser`     → cualquier usuario autenticado (admin o user).
//   `isAuthenticated` → SOLO admin validado. Es el gate de AdminProtectedRoute.
//
// La sesión vive solo en memoria: al cargar la app el estado arranca vacío y
// `initializeAuth` lo recupera con la cookie httpOnly del refresh token.
// `authInitialized` indica que ese intento ya terminó (con o sin sesión).

export type { AuthUser };

interface AuthState {
  isAuthenticated: boolean;
  authInitialized: boolean;
  currentUser: AuthUser | null;
  initializeAuth: () => Promise<void>;
  login: (email: string, pass: string, captchaToken?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const ADMIN_ROLE = 'admin';

const toSessionState = (user: AuthUser | null) => ({
  currentUser: user,
  isAuthenticated: user?.role === ADMIN_ROLE,
  authInitialized: true,
});

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  authInitialized: false,

  initializeAuth: async () => {
    const user = await authService.restoreSession();
    set(toSessionState(user));
  },

  login: async (email, pass, captchaToken) => {
    const user = await authService.login(email, pass, captchaToken);
    set(toSessionState(user));
    return user.role === ADMIN_ROLE;
  },

  logout: async () => {
    await authService.logout();
    set(toSessionState(null));
  },
}));
