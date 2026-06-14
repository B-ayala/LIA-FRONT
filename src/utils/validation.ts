/**
 * Utilidades de validación reutilizables
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

const MIN_PASSWORD_LENGTH = 6;

export const validatePassword = (password: string): string | null => {
  if (!password.trim()) return 'La contraseña es requerida';
  if (password.length < MIN_PASSWORD_LENGTH)
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  return null;
};

export const validatePasswordMatch = (password: string, confirmPassword: string): string | null => {
  if (password !== confirmPassword) return 'Las contraseñas no coinciden';
  return null;
};

export const PHONE_REGEX = /^\+?[\d\s\-()]{7,20}$/;

export const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) return 'El número de celular es requerido';
  if (!PHONE_REGEX.test(phone.trim())) return 'Ingresa un número de celular válido';
  return null;
};
