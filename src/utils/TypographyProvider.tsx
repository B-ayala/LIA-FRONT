import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { getSiteContent, saveSiteContent } from '../services/siteContentService';
import { supabase } from '../config/supabaseClient';

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
// La tipografía es configuración global del sitio: la define el admin desde el
// panel y se publica en `site_content` (key='typography'). No hay preferencia
// local del visitante — todo dispositivo siempre refleja lo último publicado.

const REMOTE_KEY = 'typography';

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
  const [config, setConfigState] = useState<TypographyConfig>({ ...DEFAULT_TYPOGRAPHY });
  const [publishState, setPublishState] = useState<PublishState>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);

  // Inject / update the Google Fonts link when the font changes.
  useEffect(() => {
    injectGoogleFont(config.fontId);
  }, [config.fontId]);

  // Fetch global config from Supabase al montar, y se suscribe a
  // postgres_changes para reflejarlo en tiempo real en cualquier dispositivo.
  useEffect(() => {
    let cancelled = false;

    const applyRemote = () => {
      getSiteContent<TypographyConfig>(REMOTE_KEY)
        .then((remote) => {
          if (cancelled) return;
          if (remote && typeof remote.fontId === 'string' && FONT_MAP.has(remote.fontId)) {
            setConfigState({ ...DEFAULT_TYPOGRAPHY, ...remote });
          }
        })
        .catch(() => {
          // Degrada al default sin interrumpir la UI.
        });
    };

    applyRemote();

    const channel = supabase
      .channel('public:site_content:typography')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_content',
          filter: `key=eq.${REMOTE_KEY}`,
        },
        () => applyRemote(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  const setConfig = useCallback((patch: Partial<TypographyConfig>) => {
    setConfigState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetConfig = useCallback(() => {
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
