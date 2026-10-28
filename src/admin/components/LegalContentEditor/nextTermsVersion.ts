const STORE_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** Fecha de hoy como AAAA-MM-DD en la hora del negocio. */
export const todayInStoreZone = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: STORE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/**
 * Versión nueva de los Términos: la fecha de hoy, y `.2`, `.3`… si ya se publicó otra versión el mismo día.
 * El formato cumple el CHECK de la base (1–40 caracteres de [A-Za-z0-9_.-]).
 */
export const nextTermsVersion = (currentVersion: string, now: Date = new Date()): string => {
  const today = todayInStoreZone(now);
  if (currentVersion === today) return `${today}.2`;
  const sameDay = currentVersion.match(/^(\d{4}-\d{2}-\d{2})\.(\d+)$/);
  if (sameDay && sameDay[1] === today) return `${today}.${Number(sameDay[2]) + 1}`;
  return today;
};
