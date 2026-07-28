import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { getSiteContent, saveSiteContent } from '../services/siteContentService';

// ─── Font catalog ─────────────────────────────────────────────────────────────

export interface FontOption {
  id: string;
  label: string;
  family: string;       // CSS font-family value
  googleParam: string;  // Google Fonts CSS2 param (family+weights, URL-ready)
  weights: number[];    // available weights for this font
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'poppins',
    label: 'Poppins',
    family: "'Poppins', sans-serif",
    googleParam: 'Poppins:wght@300;400;500;600;700',
    weights: [300, 400, 500, 600, 700],
  },
  {
    id: 'inter',
    label: 'Inter',
    family: "'Inter', sans-serif",
    googleParam: 'Inter:wght@300;400;500;600;700',
    weights: [300, 400, 500, 600, 700],
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    family: "'Montserrat', sans-serif",
    googleParam: 'Montserrat:wght@300;400;500;600;700',
    weights: [300, 400, 500, 600, 700],
  },
  {
    id: 'raleway',
    label: 'Raleway',
    family: "'Raleway', sans-serif",
    googleParam: 'Raleway:wght@300;400;500;600;700',
    weights: [300, 400, 500, 600, 700],
  },
  {
    id: 'nunito',
    label: 'Nunito',
    family: "'Nunito', sans-serif",
    googleParam: 'Nunito:wght@300;400;500;600;700',
    weights: [300, 400, 500, 600, 700],
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    family: "'Playfair Display', serif",
    googleParam: 'Playfair+Display:wght@400;500;600;700',
    weights: [400, 500, 600, 700],
  },
  {
    id: 'cormorant',
    label: 'Cormorant Garamond',
    family: "'Cormorant Garamond', serif",
    googleParam: 'Cormorant+Garamond:wght@300;400;500;600;700',
    weights: [300, 400, 500, 600, 700],
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    family: "'DM Sans', sans-serif",
    googleParam: 'DM+Sans:wght@300;400;500;600;700',
    weights: [300, 400, 500, 600, 700],
  },
];

export const FONT_MAP = new Map(FONT_OPTIONS.map((f) => [f.id, f]));

// ─── Config types ─────────────────────────────────────────────────────────────

export interface TypographyConfig {
  fontId: string;
  fontWeight: number;     // 300 | 400 | 500 | 600 | 700
  letterSpacing: number;  // em value (e.g. 0.02 → "0.02em"); 0 = normal
  lineHeight: number;     // unitless (e.g. 1.6)
}

export const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  fontId: 'poppins',
  fontWeight: 400,
  letterSpacing: 0,
  lineHeight: 1.6,
};

type PublishState = 'idle' | 'saving' | 'saved' | 'error';

// ─── Context shape ────────────────────────────────────────────────────────────

interface TypographyContextValue {
  config: TypographyConfig;
  activeFont: FontOption;
  setConfig: (patch: Partial<TypographyConfig>) => void;
  resetConfig: () => void;
  publishGlobal: () => Promise<void>;
  publishState: PublishState;
  publishError: string | null;
  userLayoutStyle: CSSProperties;
}

const TypographyContext = createContext<TypographyContextValue | null>(null);

export const useTypography = (): TypographyContextValue => {
  const ctx = useContext(TypographyContext);
  if (!ctx) throw new Error('useTypography debe usarse dentro de <TypographyProvider>');
  return ctx;
};

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'lia.typography.v1';
const REMOTE_KEY = 'typography';

const readLocal = (): TypographyConfig | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TypographyConfig>;
    if (typeof parsed.fontId !== 'string' || !FONT_MAP.has(parsed.fontId)) return null;
    return {
      fontId: parsed.fontId,
      fontWeight: typeof parsed.fontWeight === 'number' ? parsed.fontWeight : DEFAULT_TYPOGRAPHY.fontWeight,
      letterSpacing: typeof parsed.letterSpacing === 'number' ? parsed.letterSpacing : DEFAULT_TYPOGRAPHY.letterSpacing,
      lineHeight: typeof parsed.lineHeight === 'number' ? parsed.lineHeight : DEFAULT_TYPOGRAPHY.lineHeight,
    };
  } catch {
    return null;
  }
};

const writeLocal = (config: TypographyConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage lleno o deshabilitado — el cambio vive en memoria.
  }
};

// ─── DOM: Google Fonts ────────────────────────────────────────────────────────

const FONT_LINK_ID = 'lia-typography-font';

const injectGoogleFont = (fontId: string): void => {
  // Poppins ya está pre-cargada en index.html con media-trick.
  const font = FONT_MAP.get(fontId);
  const existing = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;

  if (!font || fontId === 'poppins') {
    existing?.remove();
    return;
  }

  const href = `https://fonts.googleapis.com/css2?family=${font.googleParam}&display=swap`;
  if (existing) {
    if (existing.getAttribute('href') !== href) existing.setAttribute('href', href);
    return;
  }

  const link = document.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const TypographyProvider = ({ children }: { children: ReactNode }) => {
  const { initial, hadLocal } = useMemo(() => {
    const stored = readLocal();
    return { initial: stored ?? { ...DEFAULT_TYPOGRAPHY }, hadLocal: stored !== null };
  }, []);

  const hasExplicit = useRef(hadLocal);
  const [config, setConfigState] = useState<TypographyConfig>(initial);
  const [publishState, setPublishState] = useState<PublishState>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);

  // Inject / update the Google Fonts link when the font changes.
  useEffect(() => {
    injectGoogleFont(config.fontId);
  }, [config.fontId]);

  // Persist local whenever the config changes (only after the user made an explicit choice).
  useEffect(() => {
    if (!hasExplicit.current) return;
    writeLocal(config);
  }, [config]);

  // Fetch global default from Supabase when the user has no local preference.
  useEffect(() => {
    if (hasExplicit.current) return;
    let cancelled = false;
    getSiteContent<TypographyConfig>(REMOTE_KEY)
      .then((remote) => {
        if (cancelled || hasExplicit.current) return;
        if (remote && typeof remote.fontId === 'string' && FONT_MAP.has(remote.fontId)) {
          setConfigState({ ...DEFAULT_TYPOGRAPHY, ...remote });
        }
      })
      .catch(() => {
        // Degrada al default sin interrumpir la UI.
      });
    return () => { cancelled = true; };
  }, []);

  const setConfig = useCallback((patch: Partial<TypographyConfig>) => {
    hasExplicit.current = true;
    setConfigState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetConfig = useCallback(() => {
    hasExplicit.current = true;
    setConfigState({ ...DEFAULT_TYPOGRAPHY });
  }, []);

  const publishGlobal = useCallback(async () => {
    setPublishState('saving');
    setPublishError(null);
    try {
      await saveSiteContent<TypographyConfig>(REMOTE_KEY, config);
      setPublishState('saved');
      setTimeout(() => setPublishState('idle'), 3000);
    } catch {
      setPublishState('error');
      setPublishError('No se pudo guardar la tipografía para todos los usuarios.');
    }
  }, [config]);

  const activeFont = useMemo(
    () => FONT_MAP.get(config.fontId) ?? FONT_OPTIONS[0],
    [config.fontId],
  );

  const userLayoutStyle = useMemo<CSSProperties>(() => ({
    fontFamily: activeFont.family,
    fontWeight: config.fontWeight,
    letterSpacing: config.letterSpacing === 0 ? 'normal' : `${config.letterSpacing}em`,
    lineHeight: config.lineHeight,
  }), [activeFont.family, config.fontWeight, config.letterSpacing, config.lineHeight]);

  const value = useMemo<TypographyContextValue>(() => ({
    config,
    activeFont,
    setConfig,
    resetConfig,
    publishGlobal,
    publishState,
    publishError,
    userLayoutStyle,
  }), [config, activeFont, setConfig, resetConfig, publishGlobal, publishState, publishError, userLayoutStyle]);

  return (
    <TypographyContext.Provider value={value}>
      {children}
    </TypographyContext.Provider>
  );
};
