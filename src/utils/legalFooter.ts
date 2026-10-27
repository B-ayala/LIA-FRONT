// Validaciones de los datos legales del vendedor y del código de Data Fiscal (ARCA, Formulario 960/D).

export const LEGAL_FIELD_MAX = {
  legalName: 120,
  fiscalAddress: 200,
  businessHours: 120,
  responsibleArea: 100,
} as const;

const CUIT_DIGITS = 11;
const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;
const CUIT_MODULUS = 11;
const CUIT_DV_WHEN_REMAINDER_ONE = 9;

/** Solo dígitos del CUIT; ignora guiones y espacios. */
export const cuitDigits = (value: string): string => value.replace(/\D/g, '');

/** XX-XXXXXXXX-X a partir de 11 dígitos; devuelve el valor tal cual si no los tiene. */
export const formatCuit = (value: string): string => {
  const digits = cuitDigits(value);
  if (digits.length !== CUIT_DIGITS) return value.trim();
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
};

/** Vacío es válido (el campo es opcional); si se carga, exige 11 dígitos y dígito verificador correcto. */
export const getCuitError = (value: string): string | null => {
  if (!value.trim()) return null;
  if (/[^\d\s-]/.test(value)) return 'El CUIT solo puede tener números y guiones.';

  const digits = cuitDigits(value);
  if (digits.length !== CUIT_DIGITS) return 'El CUIT debe tener 11 dígitos (ej: 20-12345678-6).';

  const sum = CUIT_WEIGHTS.reduce((acc, weight, i) => acc + weight * Number(digits[i]), 0);
  const remainder = CUIT_MODULUS - (sum % CUIT_MODULUS);
  let expected = remainder;
  if (remainder === CUIT_MODULUS) expected = 0;
  else if (remainder === CUIT_MODULUS - 1) expected = CUIT_DV_WHEN_REMAINDER_ONE;

  return expected === Number(digits[CUIT_DIGITS - 1])
    ? null
    : 'El CUIT no es válido: revisá los números.';
};

export const getMaxLengthError = (label: string, value: string, max: number): string | null =>
  value.trim().length > max ? `${label}: máximo ${max} caracteres.` : null;

const ARCA_HOSTS: ReadonlySet<string> = new Set([
  'afip.gob.ar',
  'www.afip.gob.ar',
  'qr.afip.gob.ar',
  'arca.gob.ar',
  'www.arca.gob.ar',
  'qr.arca.gob.ar',
]);

export interface DataFiscalParsed {
  url: string;
  imageUrl: string;
}

export type DataFiscalResult =
  | { ok: true; value: DataFiscalParsed }
  | { ok: false; error: string };

const INVALID_CODE_MESSAGE =
  'No pudimos leer el código de Data Fiscal. Pegá el código completo que te da ARCA en el servicio "Formulario 960/D".';
const FOREIGN_HOST_MESSAGE =
  'El código no apunta a un sitio oficial de ARCA. Generalo de nuevo desde el servicio "Formulario 960/D".';

/** https absoluto y host de ARCA/AFIP; http se normaliza a https. null si no cumple. */
export const toArcaHttpsUrl = (raw: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!ARCA_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  if (parsed.username || parsed.password) return null;
  parsed.protocol = 'https:';
  return parsed.toString();
};

/**
 * Extrae del HTML pegado SOLO el href del <a> y el src del <img>. Nunca se inyecta el HTML:
 * DOMParser crea un documento inerte (no ejecuta scripts ni carga imágenes).
 */
export const parseDataFiscalCode = (html: string): DataFiscalResult => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const anchor = doc.querySelector('a[href]');
  const href = anchor?.getAttribute('href');
  if (!href) return { ok: false, error: INVALID_CODE_MESSAGE };

  const url = toArcaHttpsUrl(href);
  if (!url) return { ok: false, error: FOREIGN_HOST_MESSAGE };

  const src = anchor?.querySelector('img')?.getAttribute('src') ?? '';
  const imageUrl = src ? toArcaHttpsUrl(src) ?? '' : '';
  return { ok: true, value: { url, imageUrl } };
};

export interface LegalFooterValues {
  legalName: string;
  cuit: string;
  fiscalAddress: string;
  businessHours: string;
  responsibleArea: string;
}

export type LegalFooterErrors = Partial<Record<keyof LegalFooterValues, string>>;

const LEGAL_LABELS: Record<Exclude<keyof LegalFooterValues, 'cuit'>, string> = {
  legalName: 'Razón social',
  fiscalAddress: 'Domicilio',
  businessHours: 'Horario de atención',
  responsibleArea: 'Área responsable',
};

export const getLegalFooterErrors = (values: LegalFooterValues): LegalFooterErrors => {
  const errors: LegalFooterErrors = { cuit: getCuitError(values.cuit) ?? undefined };
  (Object.keys(LEGAL_LABELS) as Array<keyof typeof LEGAL_LABELS>).forEach((key) => {
    const error = getMaxLengthError(LEGAL_LABELS[key], values[key], LEGAL_FIELD_MAX[key]);
    if (error) errors[key] = error;
  });
  return errors;
};

export const hasLegalFooterErrors = (errors: LegalFooterErrors): boolean =>
  Object.values(errors).some(Boolean);

const SELLER_KEYS: ReadonlyArray<keyof LegalFooterValues> = [
  'legalName', 'cuit', 'fiscalAddress', 'businessHours', 'responsibleArea',
];

/** ¿Hay al menos un dato del vendedor cargado? Si no, el Footer no muestra el bloque. */
export const hasSellerInfo = (info: Partial<Record<keyof LegalFooterValues, string>>): boolean =>
  SELLER_KEYS.some((key) => Boolean(info[key]?.trim()));
