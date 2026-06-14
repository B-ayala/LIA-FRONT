import { create } from 'zustand';
import * as authService from '../services/authService';
import { tokenStorage } from '../utils/tokenStorage';

// ─── Authentication store ────────────────────────────────────────────────────
//
// Semántica de los dos flags (intencionalmente distintos):
//   `currentUser`     → cualquier usuario autenticado (admin o user).
//   `isAuthenticated` → SOLO admin validado. Es el gate de AdminProtectedRoute.

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  emailConfirmed?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  authInitialized: boolean;
  currentUser: AuthUser | null;
  initializeAuth: () => Promise<void>;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUserFromStorage: () => void;
}

// Hidratación sincrónica desde localStorage: el primer render YA tiene el estado correcto,
// evitando que AdminProtectedRoute redirija al refrescar (/admin → F5) por un render con
// isAuthenticated=false antes del useEffect de hidratación.
const hydrateFromStorage = (): { currentUser: AuthUser | null; isAuthenticated: boolean } => {
  const stored = tokenStorage.getUser();
  if (stored && tokenStorage.getAccessToken()) {
    return { currentUser: stored, isAuthenticated: stored.role === 'admin' };
  }
  return { currentUser: null, isAuthenticated: false };
};

export const useAuthStore = create<AuthState>((set) => ({
  ...hydrateFromStorage(),
  authInitialized: false,

  // Re-sincroniza con localStorage (útil si otra pestaña actualizó la sesión).
  setUserFromStorage: () => {
    const stored = tokenStorage.getUser();
    if (stored && tokenStorage.getAccessToken()) {
      set({
        currentUser: stored,
        isAuthenticated: stored.role === 'admin',
      });
    }
  },

  // Llama /auth/me para validar contra backend (refresca si hace falta gracias a apiFetch).
  // Si me() falla pero los tokens siguen presentes, es un error de red transitorio:
  // mantenemos el estado hidratado en lugar de expulsar al admin. apiFetch ya dispara
  // AUTH_LOGOUT_EVENT en errores de auth reales (TOKEN_INVALID/USER_NOT_FOUND/refresh fallido).
  initializeAuth: async () => {
    if (!tokenStorage.getAccessToken()) {
      set({ currentUser: null, isAuthenticated: false, authInitialized: true });
      return;
    }
    const user = await authService.me();
    if (!user) {
      if (tokenStorage.getAccessToken()) {
        set({ authInitialized: true });
        return;
      }
      set({ currentUser: null, isAuthenticated: false, authInitialized: true });
      return;
    }
    set({
      currentUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailConfirmed: user.emailConfirmed,
      },
      isAuthenticated: user.role === 'admin',
      authInitialized: true,
    });
  },

  login: async (email, pass) => {
    const user = await authService.login(email, pass);
    const userData: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailConfirmed: user.emailConfirmed,
    };
    if (user.role === 'admin') {
      set({ isAuthenticated: true, authInitialized: true, currentUser: userData });
      return true;
    }
    set({ currentUser: userData, authInitialized: true });
    return false;
  },

  logout: async () => {
    await authService.logout();
    set({ isAuthenticated: false, currentUser: null, authInitialized: true });
  },
}));
