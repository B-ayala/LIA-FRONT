import { useEffect, useState } from 'react';
import { DEFAULT_TERMS, TERMS_CONTENT_KEY, getTermsContent, type TermsContent } from '../services/termsService';
import { DEFAULT_RETURNS, RETURNS_CONTENT_KEY, getReturnsContent, type ReturnsContent } from '../services/returnsService';
import { DEFAULT_PRIVACY, PRIVACY_CONTENT_KEY, getPrivacyContent, type PrivacyContent } from '../services/privacyService';
import { useSiteContentRefresh } from './useSiteContentRefresh';

interface LegalContentState<T> {
  content: T;
  loading: boolean;
}

const TERMS_KEYS = [TERMS_CONTENT_KEY] as const;
const RETURNS_KEYS = [RETURNS_CONTENT_KEY] as const;
const PRIVACY_KEYS = [PRIVACY_CONTENT_KEY] as const;

/** Texto legal publicado por el admin. Mientras carga (o si falla) rige el texto por defecto. */
const useLegalContent = <T>(load: () => Promise<T>, fallback: T, keys: readonly string[]): LegalContentState<T> => {
  const [state, setState] = useState<LegalContentState<T>>({ content: fallback, loading: true });
  const refreshTick = useSiteContentRefresh(keys);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((content) => { if (!cancelled) setState({ content, loading: false }); })
      .catch(() => { if (!cancelled) setState({ content: fallback, loading: false }); });
    return () => { cancelled = true; };
  }, [load, fallback, refreshTick]);

  return state;
};

export const useTermsContent = (): LegalContentState<TermsContent> =>
  useLegalContent(getTermsContent, DEFAULT_TERMS, TERMS_KEYS);

export const useReturnsContent = (): LegalContentState<ReturnsContent> =>
  useLegalContent(getReturnsContent, DEFAULT_RETURNS, RETURNS_KEYS);

export const usePrivacyContent = (): LegalContentState<PrivacyContent> =>
  useLegalContent(getPrivacyContent, DEFAULT_PRIVACY, PRIVACY_KEYS);
