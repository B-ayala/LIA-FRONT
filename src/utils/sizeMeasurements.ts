import { SIZE_LIMITS, type SizeMeasurements } from '../types/size';

/** Forma en que se compara y guarda el nombre de un talle: sin espacios y en MAYÚSCULAS. */
export const toSizeKey = (name: string): string => name.trim().toUpperCase();

/** Descarta medidas sin nombre, recorta textos a los límites del backend y respeta el máximo. */
export const sanitizeMeasurements = (raw?: SizeMeasurements | null): SizeMeasurements => {
  const entries = Object.entries(raw ?? {})
    .map(([key, value]) => [
      key.trim().slice(0, SIZE_LIMITS.maxMeasurementKeyLength),
      String(value ?? '').trim().slice(0, SIZE_LIMITS.maxMeasurementValueLength),
    ] as const)
    .filter(([key]) => key.length > 0)
    .slice(0, SIZE_LIMITS.maxMeasurements);
  return Object.fromEntries(entries);
};

export interface MeasurementRow {
  key: string;
  value: string;
}

export const measurementsToRows = (measurements?: SizeMeasurements): MeasurementRow[] =>
  Object.entries(measurements ?? {}).map(([key, value]) => ({ key, value }));

export const rowsToMeasurements = (rows: MeasurementRow[]): SizeMeasurements =>
  sanitizeMeasurements(Object.fromEntries(rows.map(({ key, value }) => [key, value])));

/** Mensaje de error si dos filas con nombre repiten la medida (sin distinguir mayúsculas). */
export const findDuplicateMeasurementError = (rows: MeasurementRow[]): string | null => {
  const seen = new Set<string>();
  for (const { key } of rows) {
    const normalized = key.trim().toLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) return `La medida "${key.trim()}" está repetida.`;
    seen.add(normalized);
  }
  return null;
};
