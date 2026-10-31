import { useCallback, useEffect, useState } from 'react';
import { getSizeGuideContent } from '../services/sizeGuideContentService';
import { DEFAULT_SIZE_GUIDE_CONTENT } from '../utils/sizeGuideContent';
import { extractErrorMessage } from '../utils/errorMessage';
import type { SizeGuideContent } from '../types/sizeGuideContent';

export type SizeGuideContentStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ContentResult {
  request: number;
  content: SizeGuideContent;
  error: string;
}

/**
 * Textos globales de la guía de talles. `enabled=false` no pide nada (status `idle`).
 * Con error, `content` queda en los textos por defecto: no afirman nada del producto.
 */
export const useSizeGuideContent = (enabled = true) => {
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<ContentResult | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    getSizeGuideContent()
      .then((content) => { if (!cancelled) setResult({ request, content, error: '' }); })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResult({ request, content: DEFAULT_SIZE_GUIDE_CONTENT, error: extractErrorMessage(err, 'No pudimos cargar los textos de la guía.') });
        }
      });
    return () => { cancelled = true; };
  }, [enabled, request]);

  const reload = useCallback(() => setRequest((current) => current + 1), []);

  const current = enabled && result?.request === request ? result : null;
  const status: SizeGuideContentStatus = !enabled ? 'idle' : current ? (current.error ? 'error' : 'ready') : 'loading';

  return { status, content: current?.content ?? DEFAULT_SIZE_GUIDE_CONTENT, error: current?.error ?? '', reload };
};
