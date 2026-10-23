export const EMPTY_LABEL_ERROR = 'Escribí el texto de la opción.';
export const DUPLICATE_LABEL_ERROR = 'Ya existe una opción con ese texto.';

const normalize = (label: string) => label.trim().toLowerCase();

/** Valida el texto de una opción contra el resto de la lista; devuelve el mensaje de error o null si es válido. */
export const validateCardOptionLabel = (label: string, otherLabels: string[]): string | null => {
  const normalized = normalize(label);
  if (!normalized) return EMPTY_LABEL_ERROR;
  if (otherLabels.some((other) => normalize(other) === normalized)) return DUPLICATE_LABEL_ERROR;
  return null;
};
