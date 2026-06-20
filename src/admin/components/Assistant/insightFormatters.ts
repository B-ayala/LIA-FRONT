// Formateadores de presentación para las celdas/métricas del asistente.
// El backend manda valores crudos + un hint de formato; el locale vive acá.

const arsCurrency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});
const arsNumber = new Intl.NumberFormat('es-AR');

export const formatCurrency = (value: unknown): string => arsCurrency.format(Number(value) || 0);

export const formatNumber = (value: unknown): string => arsNumber.format(Number(value) || 0);

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatTime = (value: unknown): string => {
  const date = toDate(value);
  return date ? date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—';
};

export const formatDate = (value: unknown): string => {
  const date = toDate(value);
  return date ? date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
};

/** Segundos transcurridos → "2 h 5 m" / "12 m" / "45 s". */
export const formatAge = (value: unknown): string => {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours} h ${minutes} m`;
  if (minutes > 0) return `${minutes} m`;
  return `${total} s`;
};

export const formatMethod = (value: unknown): string => {
  if (value === 'mp') return 'Mercado Pago';
  if (value === 'transfer') return 'Transferencia';
  return value ? String(value) : '—';
};

/** Respuesta del nudge post-WhatsApp ('origin' en ventas). */
export const formatOrigin = (value: unknown): string => {
  switch (value) {
    case 'wa_confirmado': return 'Confirmó';
    case 'wa_sin_confirmar': return 'Sin confirmar';
    case 'wa_abandonado': return 'Abandonó';
    default: return 'Sin respuesta';
  }
};

/** Hora local legible para el sello "Actualizado a las …". */
export const formatGeneratedAt = (iso: string): string => formatTime(iso);
