import { useCallback, useEffect, useMemo, useState } from 'react';
import { listSizes } from '../services/sizeService';
import { extractErrorMessage } from '../utils/errorMessage';
import type { Size } from '../types/size';

export type SizeCatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

interface SizeCatalogResult {
  /** Pedido al que responde este resultado (permite saber si quedó viejo tras `reload`). */
  request: number;
  sizes: Size[];
  error: string;
}

const NO_SIZES: Size[] = [];

/**
 * Catálogo global de talles con estados de carga. `enabled=false` no pide nada (status `idle`).
 * `reload` ignora la caché del servicio.
 */
export const useSizeCatalog = (enabled = true) => {
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<SizeCatalogResult | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    listSizes({ force: request > 0 })
      .then((sizes) => { if (!cancelled) setResult({ request, sizes, error: '' }); })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ request, sizes: NO_SIZES, error: extractErrorMessage(err, 'No pudimos cargar los talles.') });
      });
    return () => { cancelled = true; };
  }, [enabled, request]);

  const reload = useCallback(() => setRequest((current) => current + 1), []);

  const current = enabled && result?.request === request ? result : null;
  const status: SizeCatalogStatus = !enabled ? 'idle' : current ? (current.error ? 'error' : 'ready') : 'loading';
  const sizes = current?.sizes ?? NO_SIZES;
  const byId = useMemo(() => new Map(sizes.map((size) => [size.id, size])), [sizes]);

  return { status, sizes, byId, error: current?.error ?? '', reload };
};
