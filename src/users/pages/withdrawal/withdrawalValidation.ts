import { validateEmail, validateName, normalizeName } from '../../../utils/validation';
import type { WithdrawalPayload } from '../../../services/withdrawalService';

// Mismos topes que el backend (POST /api/withdrawals): si cambian allá, cambian acá.
export const DESCRIPTION_MIN_LENGTH = 5;
export const DESCRIPTION_MAX_LENGTH = 500;
const ORDER_NUMBER_MAX_DIGITS = 9;
const ORDER_NUMBER_REGEX = /^\d+$/;
const MAX_PURCHASE_AMOUNT = 9_999_999_999;
const AMOUNT_WITH_THOUSANDS_REGEX = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/;
const AMOUNT_PLAIN_REGEX = /^\d+([.,]\d{1,2})?$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface WithdrawalFormValues {
  name: string;
  email: string;
  description: string;
  orderNumber: string;
  purchaseDate: string;
  purchaseAmount: string;
}

export type WithdrawalField = keyof WithdrawalFormValues;
export type WithdrawalErrors = Partial<Record<WithdrawalField, string>>;

export const EMPTY_WITHDRAWAL_FORM: WithdrawalFormValues = {
  name: '',
  email: '',
  description: '',
  orderNumber: '',
  purchaseDate: '',
  purchaseAmount: '',
};

/** Acepta "1001" o "#1001". Los datos de la compra son opcionales: vacío es válido. */
export const parseOrderNumber = (raw: string): number | null => {
  const digits = raw.trim().replace(/^#/, '');
  if (!ORDER_NUMBER_REGEX.test(digits) || digits.length > ORDER_NUMBER_MAX_DIGITS) return null;
  const value = Number(digits);
  return value > 0 ? value : null;
};

/** Acepta "15000", "15000,50", "15000.50" y "15.000,50"; null si no es un importe positivo. */
export const parsePurchaseAmount = (raw: string): number | null => {
  const text = raw.trim().replace(/^\$\s*/, '');
  let normalized: string;
  if (AMOUNT_WITH_THOUSANDS_REGEX.test(text)) normalized = text.replace(/\./g, '').replace(',', '.');
  else if (AMOUNT_PLAIN_REGEX.test(text)) normalized = text.replace(',', '.');
  else return null;
  const value = Number(normalized);
  return value > 0 && value <= MAX_PURCHASE_AMOUNT ? value : null;
};

/** Fecha de hoy en formato del input date (hora local), tope de "fecha de compra". */
export const todayIsoDate = (now: Date = new Date()): string => {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
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

const validatePurchaseDate = (value: string): string | null => {
  if (!value) return null;
  if (!ISO_DATE_REGEX.test(value) || Number.isNaN(Date.parse(value))) return 'Ingresá una fecha válida';
  return value > todayIsoDate() ? 'La fecha no puede ser futura' : null;
};

const validatePurchaseAmount = (value: string): string | null => {
  if (!value.trim()) return null;
  return parsePurchaseAmount(value) === null ? 'Ingresá solo el importe, por ejemplo 15000' : null;
};

export const validateWithdrawalField = (field: WithdrawalField, values: WithdrawalFormValues): string | null => {
  switch (field) {
    case 'name': return validateName(values.name);
    case 'email': return validateEmail(values.email);
    case 'description': return validateDescription(values.description);
    case 'orderNumber': return validateOrderNumber(values.orderNumber);
    case 'purchaseDate': return validatePurchaseDate(values.purchaseDate);
    case 'purchaseAmount': return validatePurchaseAmount(values.purchaseAmount);
  }
};

const FIELDS: readonly WithdrawalField[] = ['name', 'email', 'description', 'orderNumber', 'purchaseDate', 'purchaseAmount'];

export const validateWithdrawalForm = (values: WithdrawalFormValues): WithdrawalErrors => {
  const errors: WithdrawalErrors = {};
  for (const field of FIELDS) {
    const message = validateWithdrawalField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
};

/** Pre-condición: el formulario ya pasó `validateWithdrawalForm`. Los datos vacíos no se envían. */
export const toWithdrawalPayload = (values: WithdrawalFormValues): WithdrawalPayload => {
  const orderNumber = parseOrderNumber(values.orderNumber);
  const purchaseAmount = parsePurchaseAmount(values.purchaseAmount);
  return {
    name: normalizeName(values.name),
    email: values.email.trim(),
    description: values.description.trim(),
    ...(orderNumber !== null ? { orderNumber } : {}),
    ...(values.purchaseDate ? { purchaseDate: values.purchaseDate } : {}),
    ...(purchaseAmount !== null ? { purchaseAmount } : {}),
  };
};
