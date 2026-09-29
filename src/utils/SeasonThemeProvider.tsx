import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CUSTOM_CSS_VAR_NAMES,
  DEFAULT_CUSTOM_PALETTE,
  DEFAULT_SEASON,
  SEASONS,
  buildCustomCssVars,
  createCustomThemeId,
  detectSeasonFromDate,
  isSeasonId,
  type CustomTheme,
  type SeasonId,
  type SeasonPalette,
  type ThemeMode,
} from './seasonThemes';
import { getSiteContent } from '../services/siteContentService';
import { supabase } from '../config/supabaseClient';

const REMOTE_THEME_KEY = 'season_theme';

interface RemoteThemePreference {
  season?: string;
  mode?: ThemeMode;
  animations?: Partial<AnimationsEnabled>;
  customPalette?: Partial<SeasonPalette>;
}

// ─── Persistencia ──────────────────────────────────────────────────────────────
// El tema (color + tipografía) es una configuración global del sitio: la define
// el admin desde el panel y se publica en la tabla `site_content` (key=
// 'season_theme'). No existe — ni debe existir — una preferencia local que el
// visitante pueda fijar por su cuenta: todo dispositivo siempre refleja lo
// último publicado, vía fetch al montar + suscripción realtime.
//
// `customThemes` (la lista de temas personalizados con nombre propio que arma
// el admin para elegir rápido) es la única pieza que sigue siendo local: es
// una libreta de borradores de ese navegador, no algo que vean los visitantes.
// Lo que sí se publica es `customPalette`: una foto del tema personalizado que
// esté activo en ese momento, sin su nombre ni id.

const CUSTOM_THEMES_STORAGE_KEY = 'lia.seasonTheme.customThemes.v1';

type AnimationsEnabled = Record<SeasonId, boolean>;

const DEFAULT_ANIMATIONS: AnimationsEnabled = {
  default: false,
  mono: false,
  rose: false,
  emerald: false,
  ocean: false,
  burgundy: false,
  spring: true,
  summer: true,
  autumn: true,
  winter: true,
  custom: false,
};

const normalizePalette = (raw: unknown): SeasonPalette => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CUSTOM_PALETTE };
  const source = raw as Partial<SeasonPalette>;
  return { ...DEFAULT_CUSTOM_PALETTE, ...source };
};

const normalizeAnimations = (raw: unknown): AnimationsEnabled => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ANIMATIONS };
  const source = raw as Record<string, unknown>;
  const out = { ...DEFAULT_ANIMATIONS };
  (Object.keys(out) as SeasonId[]).forEach((key) => {
    if (typeof source[key] === 'boolean') out[key] = source[key] as boolean;
  });
  return out;
};

const normalizeCustomThemes = (raw: unknown): CustomTheme[] => {
  if (!Array.isArray(raw)) return [];
  const out: CustomTheme[] = [];
  raw.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const { id, name, palette } = item as Partial<CustomTheme>;
    if (typeof id !== 'string' || typeof name !== 'string') return;
    out.push({ id, name, palette: normalizePalette(palette) });
  });
  return out;
};

const readLocalCustomThemes = (): CustomTheme[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    if (!raw) return [];
    return normalizeCustomThemes(JSON.parse(raw));
  } catch {
    return [];
  }
};

const writeLocalCustomThemes = (themes: CustomTheme[]): void => {
  try {
    localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes));
  } catch {
    // Storage lleno o deshabilitado — la lista de borradores sigue viva en
    // memoria, simplemente no persiste entre sesiones.
  }
};

// ─── Aplicación al DOM ─────────────────────────────────────────────────────────
// Setea el atributo `data-season` en <html> — los selectores de seasons.css
// hacen el resto. Mantener este side-effect aislado evita re-renders en cascada.

const applySeasonToDocument = (season: SeasonId, customPalette: SeasonPalette) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.season = season;
  if (season === 'custom') {
    const vars = buildCustomCssVars(customPalette);
    Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  } else {
    CUSTOM_CSS_VAR_NAMES.forEach((name) => root.style.removeProperty(name));
  }
};

// ─── Contexto ──────────────────────────────────────────────────────────────────

interface SeasonThemeContextValue {
  season: SeasonId;          // estación realmente aplicada al DOM
  storedSeason: SeasonId;    // estación publicada globalmente (o en edición por el admin)
  mode: ThemeMode;
  detectedSeason: SeasonId;  // según la fecha actual
  isPreviewing: boolean;
  animations: AnimationsEnabled;
  customPalette: SeasonPalette;        // paleta personalizada actualmente activa (si season === 'custom')
  customThemes: CustomTheme[];         // lista de temas personalizados guardados por el admin
  activeCustomThemeId: string | null;  // cuál de `customThemes` está aplicado ahora mismo
  isAnimationEnabled: (season: SeasonId) => boolean;
  setSeason: (season: SeasonId) => void;
  setMode: (mode: ThemeMode) => void;
  setAnimationEnabled: (season: SeasonId, enabled: boolean) => void;
  saveCustomTheme: (theme: { id?: string; name: string; palette: SeasonPalette }) => string;
  deleteCustomTheme: (id: string) => void;
  applyCustomTheme: (id: string) => void;
  previewCustomPalette: (palette: SeasonPalette) => void;
  preview: (season: SeasonId) => void;
  clearPreview: () => void;
  resetToDefault: () => void;
}

const SeasonThemeContext = createContext<SeasonThemeContextValue | null>(null);

export const useSeasonTheme = () => {
  const ctx = useContext(SeasonThemeContext);
  if (!ctx) throw new Error('useSeasonTheme debe usarse dentro de <SeasonThemeProvider>');
  return ctx;
};

interface SeasonThemeProviderProps {
  children: ReactNode;
}

export const SeasonThemeProvider = ({ children }: SeasonThemeProviderProps) => {
  const [storedSeason, setStoredSeason] = useState<SeasonId>(DEFAULT_SEASON);
  const [mode, setModeState] = useState<ThemeMode>('manual');
  const [animations, setAnimations] = useState<AnimationsEnabled>({ ...DEFAULT_ANIMATIONS });
  const [customPalette, setCustomPalette] = useState<SeasonPalette>({ ...DEFAULT_CUSTOM_PALETTE });
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => readLocalCustomThemes());
  const [activeCustomThemeId, setActiveCustomThemeId] = useState<string | null>(null);
  const [previewSeason, setPreviewSeason] = useState<SeasonId | null>(null);
  // Override temporal para previsualizar una paleta personalizada (hover sobre
  // una tarjeta guardada, o mientras se edita el formulario) sin tocar la
  // paleta realmente publicada.
  const [previewCustomOverride, setPreviewCustomOverride] = useState<SeasonPalette | null>(null);
  const [detectedSeason, setDetectedSeason] = useState<SeasonId>(() => detectSeasonFromDate());

  // Re-detecta al recuperar foco — la sesión puede cruzar un cambio de mes
  // sin recargar la pestaña.
  useEffect(() => {
    const onFocus = () => setDetectedSeason(detectSeasonFromDate());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const effectiveSeason: SeasonId = previewCustomOverride
    ? 'custom'
    : previewSeason ?? (mode === 'auto' ? detectedSeason : storedSeason);

  const effectivePalette: SeasonPalette = previewCustomOverride ?? customPalette;

  // Aplica al DOM cuando cambia. Se ejecuta también en mount, garantizando que
  // el atributo `data-season` exista incluso si SSR/hidratación es agregado luego.
  const lastApplied = useRef<{ season: SeasonId | null; palette: SeasonPalette | null }>({ season: null, palette: null });
  useEffect(() => {
    const paletteChanged = effectiveSeason === 'custom' && lastApplied.current.palette !== effectivePalette;
    if (lastApplied.current.season === effectiveSeason && !paletteChanged) return;
    applySeasonToDocument(effectiveSeason, effectivePalette);
    lastApplied.current = { season: effectiveSeason, palette: effectivePalette };
  }, [effectiveSeason, effectivePalette]);

  // Persistencia de la libreta de temas personalizados del admin — puramente
  // local, no afecta lo que ven los visitantes.
  useEffect(() => {
    writeLocalCustomThemes(customThemes);
  }, [customThemes]);

  // Tema global publicado por el admin (site_content.season_theme). Se aplica
  // siempre — no hay preferencia local que lo bloquee — y se suscribe a
  // postgres_changes para reflejar el cambio en tiempo real en cualquier
  // dispositivo, sin esperar a que se recargue la pestaña.
  useEffect(() => {
    let cancelled = false;

    const applyRemote = () => {
      getSiteContent<RemoteThemePreference>(REMOTE_THEME_KEY)
        .then((remote) => {
          if (cancelled) return;
          if (remote && isSeasonId(remote.season)) {
            setStoredSeason(remote.season);
            setModeState(remote.mode === 'auto' ? 'auto' : 'manual');
            setAnimations(normalizeAnimations(remote.animations));
            if (remote.customPalette) {
              setCustomPalette(normalizePalette(remote.customPalette));
            }
          }
        })
        .catch(() => {
          // Degrada al default sin romper la UI.
        });
    };

    applyRemote();

    const channel = supabase
      .channel('public:site_content:season_theme')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_content',
          filter: `key=eq.${REMOTE_THEME_KEY}`,
        },
        () => applyRemote(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  // Los setters de abajo alimentan el estado en memoria que usa el panel admin
  // para armar/previsualizar el tema antes de publicarlo — no persisten nada
  // por su cuenta. La única persistencia real ocurre al llamar `saveThemeGlobal`
  // en el panel, que escribe en `site_content`.

  const setSeason = useCallback((season: SeasonId) => {
    if (!SEASONS[season]) return;
    setStoredSeason(season);
    setPreviewSeason(null);
    // Elegir una estación implica salir de auto: el admin tomó control manual.
    setModeState('manual');
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setPreviewSeason(null);
  }, []);

  const setAnimationEnabled = useCallback((season: SeasonId, enabled: boolean) => {
    if (!SEASONS[season]) return;
    setAnimations((prev) => {
      if (prev[season] === enabled) return prev;
      return { ...prev, [season]: enabled };
    });
  }, []);

  const isAnimationEnabled = useCallback(
    (season: SeasonId) => SEASONS[season].hasParticles && animations[season],
    [animations],
  );

  // Crea o actualiza (si se pasa `id`) un tema personalizado guardado. Si ese
  // tema es el que está aplicado ahora mismo, refresca también la paleta en
  // vivo para que los cambios se vean sin tener que reaplicarlo a mano.
  const saveCustomTheme = useCallback((theme: { id?: string; name: string; palette: SeasonPalette }): string => {
    const id = theme.id ?? createCustomThemeId();
    const name = theme.name.trim() || 'Sin nombre';
    setCustomThemes((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next: CustomTheme = { id, name, palette: theme.palette };
      if (idx === -1) return [...prev, next];
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
    setActiveCustomThemeId((prevActive) => {
      if (prevActive === id) {
        setCustomPalette(theme.palette);
      }
      return prevActive;
    });
    return id;
  }, []);

  // Borra completamente un tema guardado — si era el que estaba aplicado, cae
  // al tema Clásico para no dejar el sitio con una paleta huérfana.
  const deleteCustomTheme = useCallback((id: string) => {
    setCustomThemes((prev) => prev.filter((t) => t.id !== id));
    setActiveCustomThemeId((prevActive) => {
      if (prevActive !== id) return prevActive;
      setStoredSeason(DEFAULT_SEASON);
      setModeState('manual');
      setPreviewSeason(null);
      setCustomPalette({ ...DEFAULT_CUSTOM_PALETTE });
      return null;
    });
  }, []);

  const applyCustomTheme = useCallback((id: string) => {
    const theme = customThemes.find((t) => t.id === id);
    if (!theme) return;
    setActiveCustomThemeId(id);
    setCustomPalette(theme.palette);
    setStoredSeason('custom');
    setModeState('manual');
    setPreviewSeason(null);
  }, [customThemes]);

  const previewCustomPalette = useCallback((palette: SeasonPalette) => {
    setPreviewCustomOverride(palette);
  }, []);

  const preview = useCallback((season: SeasonId) => {
    if (!SEASONS[season]) return;
    setPreviewCustomOverride(null);
    setPreviewSeason(season);
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewSeason(null);
    setPreviewCustomOverride(null);
  }, []);

  const resetToDefault = useCallback(() => {
    setStoredSeason(DEFAULT_SEASON);
    setModeState('manual');
    setPreviewSeason(null);
  }, []);

  const value = useMemo<SeasonThemeContextValue>(() => ({
    season: effectiveSeason,
    storedSeason,
    mode,
    detectedSeason,
    isPreviewing: previewSeason !== null || previewCustomOverride !== null,
    animations,
    customPalette,
    customThemes,
    activeCustomThemeId,
    isAnimationEnabled,
    setSeason,
    setMode,
    setAnimationEnabled,
    saveCustomTheme,
    deleteCustomTheme,
    applyCustomTheme,
    previewCustomPalette,
    preview,
    clearPreview,
    resetToDefault,
  }), [effectiveSeason, storedSeason, mode, detectedSeason, previewSeason, previewCustomOverride, animations,
       customPalette, customThemes, activeCustomThemeId, isAnimationEnabled, setSeason, setMode, setAnimationEnabled,
       saveCustomTheme, deleteCustomTheme, applyCustomTheme, previewCustomPalette, preview, clearPreview, resetToDefault]);

  return (
    <SeasonThemeContext.Provider value={value}>
      {children}
    </SeasonThemeContext.Provider>
  );
};
