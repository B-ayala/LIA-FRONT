import { useEffect, useState } from 'react';
import { DEFAULT_TERMS, getTermsContent, type TermsContent } from '../services/termsService';
import { DEFAULT_RETURNS, getReturnsContent, type ReturnsContent } from '../services/returnsService';

interface LegalContentState<T> {
  content: T;
  loading: boolean;
}

/** Texto legal publicado por el admin. Mientras carga (o si falla) rige el texto por defecto. */
const useLegalContent = <T>(load: () => Promise<T>, fallback: T): LegalContentState<T> => {
  const [state, setState] = useState<LegalContentState<T>>({ content: fallback, loading: true });

  useEffect(() => {
    let cancelled = false;
    load()
      .then((content) => { if (!cancelled) setState({ content, loading: false }); })
      .catch(() => { if (!cancelled) setState({ content: fallback, loading: false }); });
    return () => { cancelled = true; };
  }, [load, fallback]);

  return state;
};

export const useTermsContent = (): LegalContentState<TermsContent> => useLegalContent(getTermsContent, DEFAULT_TERMS);

export const useReturnsContent = (): LegalContentState<ReturnsContent> =>
  useLegalContent(getReturnsContent, DEFAULT_RETURNS);
