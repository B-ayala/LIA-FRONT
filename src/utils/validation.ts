/**
 * Utilidades de validación reutilizables.
 * Las reglas de nombre, celular y contraseña replican las del backend
 * (BACK/lia-store/utils/userValidation.js) y las del trigger `handle_new_user`:
 * si cambian acá, cambian allá.
 */

export const MAX_EMAIL_LENGTH = 254;
// Las clases de cada tramo son disjuntas: sin backtracking cuadrático ante entradas hostiles.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const isValidEmail = (email: string): boolean =>
  email.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(email);

export const validateEmail = (email: string): string | null => {
  const value = email.trim();
  if (!value) return 'El correo electrónico es requerido';
  if (!isValidEmail(value)) return 'Ingresa un correo válido';
  return null;
};

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;
// Empieza con letra; admite letras (tildes/ñ), espacios, apóstrofe, punto y guion.
export const NAME_REGEX = /^\p{L}[\p{L}\p{M}' .-]*$/u;
export const NAME_HINT = `${NAME_MIN_LENGTH} a ${NAME_MAX_LENGTH} caracteres. Solo letras, espacios, apóstrofes, puntos y guiones.`;

export const normalizeName = (name: string): string => name.normalize('NFC').trim();

export const validateName = (name: string): string | null => {
  const value = normalizeName(name);
  if (!value) return 'El nombre es requerido';
  if (value.length < NAME_MIN_LENGTH) return `El nombre debe tener al menos ${NAME_MIN_LENGTH} caracteres`;
  if (value.length > NAME_MAX_LENGTH) return `El nombre no puede tener más de ${NAME_MAX_LENGTH} caracteres`;
  if (!NAME_REGEX.test(value)) return 'El nombre solo puede tener letras, espacios, apóstrofes, puntos y guiones';
  return null;
};

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
// bcrypt (Supabase) ignora en silencio todo lo que pasa de 72 bytes: se rechaza en vez de truncar.
const PASSWORD_MAX_BYTES = 72;
// Mismo juego de símbolos que reconoce Supabase en "Password requirements".
const PASSWORD_SPECIAL_REGEX = /[!@#$%^&*()_+\-=[\]{};':"|<>?,./`~\\]/;
export const PASSWORD_HINT = `${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres, con mayúsculas, minúsculas, números y al menos un símbolo (por ejemplo ! @ # $ %).`;

export const validatePassword = (password: string): string | null => {
  if (!password) return 'La contraseña es requerida';
  if (password.length < PASSWORD_MIN_LENGTH)
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
  if (password.length > PASSWORD_MAX_LENGTH || new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES)
    return `La contraseña no puede tener más de ${PASSWORD_MAX_LENGTH} caracteres`;
  // Supabase evalúa mayúscula/minúscula sobre ASCII: una "ñ" sola no cuenta, así que se replica igual.
  if (!/[a-z]/.test(password)) return 'La contraseña debe incluir al menos una letra minúscula';
  if (!/[A-Z]/.test(password)) return 'La contraseña debe incluir al menos una letra mayúscula';
  if (!/\d/.test(password)) return 'La contraseña debe incluir al menos un número';
  if (!PASSWORD_SPECIAL_REGEX.test(password)) return 'La contraseña debe incluir al menos un símbolo (por ejemplo ! @ # $ %)';
  return null;
};

export const validatePasswordMatch = (password: string, confirmPassword: string): string | null => {
  if (password !== confirmPassword) return 'Las contraseñas no coinciden';
  return null;
};

export const PHONE_MAX_LENGTH = 20;
export const PHONE_REGEX = /^(?=.{7,20}$)\+?[\d ()-]+$/;
export const PHONE_HINT = '7 a 20 caracteres: números, espacios, guiones y paréntesis. Puede empezar con +.';

export const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) return 'El número de celular es requerido';
  if (!PHONE_REGEX.test(phone.trim())) return 'Ingresa un número de celular válido (7 a 20 caracteres)';
  return null;
};
