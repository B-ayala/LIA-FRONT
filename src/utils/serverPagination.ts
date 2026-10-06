export const ADMIN_PAGE_SIZE = 50;

// Caracteres con significado en la sintaxis de filtros de PostgREST (.or). `_` queda afuera a
// propósito: en ilike solo amplía el match y permite buscar emails como "juan_perez".
const POSTGREST_RESERVED_CHARS = /[,()%*"]/g;

export const sanitizeSearchTerm = (raw: string): string =>
  raw.replace(POSTGREST_RESERVED_CHARS, ' ').trim();

export const getPageRange = (page: number): { from: number; to: number } => {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  return { from, to: from + ADMIN_PAGE_SIZE - 1 };
};

export const getTotalPages = (totalCount: number): number =>
  Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE));

// PostgREST responde 416 / PGRST103 cuando el offset supera el total (p. ej. se borraron filas).
export const RANGE_NOT_SATISFIABLE_CODE = 'PGRST103';
