import { validateEmail, validateName, normalizeName } from '../../../utils/validation';
import type { WithdrawalPayload } from '../../../services/withdrawalService';

// Mismos topes que el backend (POST /api/withdrawals): si cambian allá, cambian acá.
export const DESCRIPTION_MIN_LENGTH = 5;
export const DESCRIPTION_MAX_LENGTH = 500;
const ORDER_NUMBER_MAX_DIGITS = 9;
const ORDER_NUMBER_REGEX = /^\d+$/;

export interface WithdrawalFormValues {
  name: string;
  email: string;
  description: string;
  orderNumber: string;
}

export type WithdrawalField = keyof WithdrawalFormValues;
export type WithdrawalErrors = Partial<Record<WithdrawalField, string>>;

export const EMPTY_WITHDRAWAL_FORM: WithdrawalFormValues = {
  name: '',
  email: '',
  description: '',
  orderNumber: '',
};

/** Acepta "1001" o "#1001"; vacío es válido porque el número de pedido es opcional. */
export const parseOrderNumber = (raw: string): number | null => {
  const digits = raw.trim().replace(/^#/, '');
  if (!ORDER_NUMBER_REGEX.test(digits) || digits.length > ORDER_NUMBER_MAX_DIGITS) return null;
  const value = Number(digits);
  return value > 0 ? value : null;
};

const validateDescription = (value: string): string | null => {
  const text = value.trim();
  if (!text) return 'Contanos qué compraste';
  if (text.length < DESCRIPTION_MIN_LENGTH) return `Escribí al menos ${DESCRIPTION_MIN_LENGTH} caracteres`;
  if (text.length > DESCRIPTION_MAX_LENGTH) return `No puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres`;
  return null;
};

const validateOrderNumber = (value: string): string | null => {
  if (!value.trim()) return null;
  return parseOrderNumber(value) === null ? 'Ingresá solo el número, por ejemplo 1001' : null;
};

export const validateWithdrawalField = (field: WithdrawalField, values: WithdrawalFormValues): string | null => {
  switch (field) {
    case 'name': return validateName(values.name);
    case 'email': return validateEmail(values.email);
    case 'description': return validateDescription(values.description);
    case 'orderNumber': return validateOrderNumber(values.orderNumber);
  }
};

const FIELDS: readonly WithdrawalField[] = ['name', 'email', 'description', 'orderNumber'];

export const validateWithdrawalForm = (values: WithdrawalFormValues): WithdrawalErrors => {
  const errors: WithdrawalErrors = {};
  for (const field of FIELDS) {
    const message = validateWithdrawalField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
};

export const toWithdrawalPayload = (values: WithdrawalFormValues): WithdrawalPayload => {
  const orderNumber = parseOrderNumber(values.orderNumber);
  return {
    name: normalizeName(values.name),
    email: values.email.trim(),
    description: values.description.trim(),
    ...(orderNumber !== null ? { orderNumber } : {}),
  };
};
