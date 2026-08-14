/**
 * Auth service — autenticación vía Supabase Auth.
 *
 * El backend (lia-store) autoriza decodificando el JWT de Supabase y leyendo el
 * rol en `profiles`. Por eso TODO el flujo de cuentas (login, registro, recuperación
 * y cambio de contraseña, confirmación de email) se resuelve contra Supabase Auth,
 * que valida credenciales y emite el token que el backend acepta como Bearer.
 */

import type { Session, User, EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '../config/supabaseClient';
import { tokenStorage, type StoredUser } from '../utils/tokenStorage';

export interface AuthUser extends StoredUser {}

export interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

interface RegisterResult {
  success: boolean;
  autoConfirmed: boolean;
  data?: AuthUser;
}

type SupabaseAuthMeta = { name?: string; phone?: string };
type ProfileRow = { name: string | null; role: string | null };
type CodedError = Error & { code?: string };

// Construye la URL de redirección de los emails respetando el base path del deploy
// (p. ej. `/LIA/` en GitHub Pages) — Supabase debe tenerla en su allowlist de redirects.
const redirectUrl = (path: string): string => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}${path}`;
};

const codedError = (message: string, code?: string): CodedError => {
  const err = new Error(message) as CodedError;
  if (code) err.code = code;
  return err;
};

const fetchProfile = async (userId: string): Promise<ProfileRow | null> => {
  // maybeSingle (no single): si todavía no hay fila en profiles, devuelve null
  // en vez de un 406. El rol cae a 'user' hasta que exista el perfil.
  const { data } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', userId)
    .maybeSingle();
  return data;
};

const buildAuthUser = (user: User, profile: ProfileRow | null): AuthUser => {
  const meta = (user.user_metadata ?? {}) as SupabaseAuthMeta;
  return {
    id: user.id,
    name: profile?.name ?? meta.name ?? '',
    email: user.email ?? '',
    phone: meta.phone,
    role: profile?.role ?? 'user',
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
};

const persistSession = (session: Session, user: AuthUser) => {
  tokenStorage.setTokens(session.access_token, session.refresh_token);
  tokenStorage.setUser(user);
};

// ─── Register ───
export const register = async (payload: RegisterPayload): Promise<RegisterResult> => {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: { name: payload.name, phone: payload.phone },
      emailRedirectTo: redirectUrl('/auth/confirm'),
    },
  });

  if (error) {
    const rateLimited = error.status === 429 || /rate limit/i.test(error.message);
    throw codedError(error.message, rateLimited ? 'RATE_LIMIT' : undefined);
  }

  // Supabase ofusca el caso "email ya registrado" devolviendo un user con identities vacío.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    throw codedError('Ese email ya está registrado.', 'EMAIL_ALREADY_CONFIRMED');
  }

  return {
    success: true,
    autoConfirmed: Boolean(data.session),
    data: data.user ? buildAuthUser(data.user, null) : undefined,
  };
};

// ─── Login ───
const toFriendlyAuthError = (rawMessage: string): { message: string; code: string } => {
  const message = rawMessage.toLowerCase();
  if (message.includes('not confirmed')) {
    return {
      code: 'EMAIL_NOT_CONFIRMED',
      message: 'Tu cuenta todavía no está confirmada. Revisá tu correo (y la carpeta de spam) para activarla.',
    };
  }
  if (message.includes('invalid login credentials') || message.includes('invalid')) {
    return { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos.' };
  }
  return { code: 'AUTH_ERROR', message: 'No pudimos iniciar sesión. Intentá de nuevo en unos minutos.' };
};

export const login = async (email: string, password: string): Promise<AuthUser> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    const friendly = toFriendlyAuthError(error?.message ?? '');
    throw codedError(friendly.message, friendly.code);
  }

  const profile = await fetchProfile(data.user.id);
  const authUser = buildAuthUser(data.user, profile);
  persistSession(data.session, authUser);
  return authUser;
};

// ─── OAuth (Google) ───
export const signInWithGoogle = async (): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl('/') },
  });
  if (error) throw new Error(error.message);
};

// ─── Logout ───
export const logout = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch {
    /* no bloqueamos el logout local si Supabase falla */
  } finally {
    tokenStorage.clear();
  }
};

// ─── Me (perfil actual, validado contra Supabase) ───
export const me = async (): Promise<AuthUser | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const profile = await fetchProfile(user.id);
    const authUser = buildAuthUser(user, profile);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) persistSession(session, authUser);
    else tokenStorage.setUser(authUser);

    return authUser;
  } catch {
    // Error de red transitorio: que el caller decida según el token persistido.
    return null;
  }
};

// ─── Email confirmation ───
export const confirmEmail = async (tokenHash: string, type: EmailOtpType = 'signup'): Promise<void> => {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) throw new Error(error.message);
};

export const resendConfirmation = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: redirectUrl('/auth/confirm') },
  });
  if (error) {
    const rateLimited = error.status === 429 || /rate limit/i.test(error.message);
    throw codedError(error.message, rateLimited ? 'RATE_LIMIT' : undefined);
  }
};

export const hasActiveSession = async (): Promise<boolean> => {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
};

// El link de recuperación dispara el evento PASSWORD_RECOVERY (puede llegar después
// del montaje del componente). Devuelve una función para desuscribirse.
export const onPasswordRecovery = (callback: () => void): (() => void) => {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') callback();
  });
  return () => data.subscription.unsubscribe();
};

// ─── Forgot / Reset password ───
export const forgotPassword = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl('/auth/reset-password'),
  });
  if (error) throw new Error(error.message);
};

// El link de recuperación de Supabase establece una sesión temporal (evento
// PASSWORD_RECOVERY). Con esa sesión activa, updateUser cambia la contraseña.
export const resetPassword = async (newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
  tokenStorage.clear();
};

// ─── Change password (logueado) ───
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw codedError('Tu sesión expiró. Volvé a iniciar sesión.', 'AUTH_ERROR');

  // Supabase.updateUser no valida la contraseña actual: re-autenticamos para hacerlo.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) throw codedError('La contraseña actual es incorrecta', 'INVALID_CURRENT_PASSWORD');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);

  // Forzamos re-login con la nueva contraseña.
  await supabase.auth.signOut();
  tokenStorage.clear();
};
