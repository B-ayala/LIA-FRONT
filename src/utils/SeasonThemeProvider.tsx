import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_SEASON,
  SEASONS,
  detectSeasonFromDate,
  isSeasonId,
  type SeasonId,
  type ThemeMode,
} from './seasonThemes';
import { getSiteContent } from '../services/siteContentService';

const REMOTE_THEME_KEY = 'season_theme';

interface RemoteThemePreference {
  season?: string;
}

// ─── Persistencia ──────────────────────────────────────────────────────────────
// Local: rápido, no requiere red, sobrevive recargas.
// Remoto (opcional): tabla `site_content` con key='season_theme' — usado cuando
// el admin elige "Aplicar a todos los usuarios". Si la lectura falla (RLS,
// tabla inexistente), el provider degrada a la preferencia local sin romper.

const STORAGE_KEY = 'lia.seasonTheme.v2';
const STORAGE_KEY_LEGACY = 'lia.seasonTheme.v1';

type AnimationsEnabled = Record<SeasonId, boolean>;

const DEFAULT_ANIMATIONS: AnimationsEnabled = {
  default: false,
  mono: false,
  spring: true,
  summer: true,
  autumn: true,
  winter: true,
};

interface PersistedPreference {
  season: SeasonId;
  mode: ThemeMode;
  animations: AnimationsEnabled;
}

const normalizeAnimations = (raw: unknown): AnimationsEnabled => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ANIMATIONS };
  const source = raw as Record<string, unknown>;
  const out = { ...DEFAULT_ANIMATIONS };
  (Object.keys(out) as SeasonId[]).forEach((key) => {
    if (typeof source[key] === 'boolean') out[key] = source[key] as boolean;
  });
  return out;
};

const readLocalPreference = (): PersistedPreference | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY_LEGACY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isSeasonId(parsed.season)) return null;
    const mode: ThemeMode = parsed.mode === 'auto' ? 'auto' : 'manual';
    return {
      season: parsed.season,
      mode,
      animations: normalizeAnimations(parsed.animations),
    };
  } catch {
    return null;
  }
};

const writeLocalPreference = (pref: PersistedPreference) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
  } catch {
    // Storage lleno o deshabilitado — el cambio sigue vivo en memoria,
    // simplemente no persiste entre sesiones.
  }
};

// ─── Aplicación al DOM ─────────────────────────────────────────────────────────
// Setea el atributo `data-season` en <html> — los selectores de seasons.css
// hacen el resto. Mantener este side-effect aislado evita re-renders en cascada.

const applySeasonToDocument = (season: SeasonId) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.season = season;
};

// ─── Contexto ──────────────────────────────────────────────────────────────────

interface SeasonThemeContextValue {
  season: SeasonId;          // estación realmente aplicada al DOM
  storedSeason: SeasonId;    // estación elegida por el usuario (manual)
  mode: ThemeMode;
  detectedSeason: SeasonId;  // según la fecha actual
  isPreviewing: boolean;
  animations: AnimationsEnabled;
  isAnimationEnabled: (season: SeasonId) => boolean;
  setSeason: (season: SeasonId) => void;
  setMode: (mode: ThemeMode) => void;
  setAnimationEnabled: (season: SeasonId, enabled: boolean) => void;
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
  // Lectura sincrónica para evitar el flash de tema neutral en el primer paint.
  const { initial, hadLocalPreference } = useMemo(() => {
    const stored = readLocalPreference();
    return {
      initial: stored ?? { season: DEFAULT_SEASON, mode: 'manual' as ThemeMode, animations: { ...DEFAULT_ANIMATIONS } },
      hadLocalPreference: stored !== null,
    };
  }, []);

  // Distingue "el usuario eligió un tema" de "todavía no tocó nada". Sólo
  // persistimos y bloqueamos el tema global cuando la elección es explícita.
  const hasExplicitPreference = useRef(hadLocalPreference);

  const [storedSeason, setStoredSeason] = useState<SeasonId>(initial.season);
  const [mode, setModeState] = useState<ThemeMode>(initial.mode);
  const [animations, setAnimations] = useState<AnimationsEnabled>(initial.animations);
  const [previewSeason, setPreviewSeason] = useState<SeasonId | null>(null);
  const [detectedSeason, setDetectedSeason] = useState<SeasonId>(() => detectSeasonFromDate());

  // Re-detecta al recuperar foco — la sesión puede cruzar un cambio de mes
  // sin recargar la pestaña.
  useEffect(() => {
    const onFocus = () => setDetectedSeason(detectSeasonFromDate());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const effectiveSeason: SeasonId = previewSeason
    ?? (mode === 'auto' ? detectedSeason : storedSeason);

  // Aplica al DOM cuando cambia. Se ejecuta también en mount, garantizando que
  // el atributo `data-season` exista incluso si SSR/hidratación es agregado luego.
  const lastApplied = useRef<SeasonId | null>(null);
  useEffect(() => {
    if (lastApplied.current === effectiveSeason) return;
    applySeasonToDocument(effectiveSeason);
    lastApplied.current = effectiveSeason;
  }, [effectiveSeason]);

  // Persistencia local — sólo la preferencia confirmada por el usuario. No
  // persistimos el tema global aplicado automáticamente: así, si el admin lo
  // cambia, los visitantes pasivos lo reflejan en la próxima visita.
  useEffect(() => {
    if (!hasExplicitPreference.current) return;
    writeLocalPreference({ season: storedSeason, mode, animations });
  }, [storedSeason, mode, animations]);

  // Tema global publicado por el admin (site_content.season_theme). Aplica sólo
  // a visitantes sin preferencia propia: su elección local siempre tiene prioridad.
  useEffect(() => {
    if (hasExplicitPreference.current) return;
    let cancelled = false;

    getSiteContent<RemoteThemePreference>(REMOTE_THEME_KEY)
      .then((remote) => {
        if (cancelled || hasExplicitPreference.current) return;
        if (remote && isSeasonId(remote.season)) {
          setStoredSeason(remote.season);
          setModeState('manual');
        }
      })
      .catch(() => {
        // Degrada a la preferencia local/default sin romper la UI.
      });

    return () => { cancelled = true; };
  }, []);

  const setSeason = useCallback((season: SeasonId) => {
    if (!SEASONS[season]) return;
    hasExplicitPreference.current = true;
    setStoredSeason(season);
    setPreviewSeason(null);
    // Elegir una estación implica salir de auto: el usuario tomó control.
    setModeState('manual');
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    hasExplicitPreference.current = true;
    setModeState(next);
    setPreviewSeason(null);
  }, []);

  const setAnimationEnabled = useCallback((season: SeasonId, enabled: boolean) => {
    if (!SEASONS[season]) return;
    hasExplicitPreference.current = true;
    setAnimations((prev) => {
      if (prev[season] === enabled) return prev;
      return { ...prev, [season]: enabled };
    });
  }, []);

  const isAnimationEnabled = useCallback(
    (season: SeasonId) => SEASONS[season].hasParticles && animations[season],
    [animations],
  );

  const preview = useCallback((season: SeasonId) => {
    if (!SEASONS[season]) return;
    setPreviewSeason(season);
  }, []);

  const clearPreview = useCallback(() => setPreviewSeason(null), []);

  const resetToDefault = useCallback(() => {
    hasExplicitPreference.current = true;
    setStoredSeason(DEFAULT_SEASON);
    setModeState('manual');
    setPreviewSeason(null);
  }, []);

  const value = useMemo<SeasonThemeContextValue>(() => ({
    season: effectiveSeason,
    storedSeason,
    mode,
    detectedSeason,
    isPreviewing: previewSeason !== null,
    animations,
    isAnimationEnabled,
    setSeason,
    setMode,
    setAnimationEnabled,
    preview,
    clearPreview,
    resetToDefault,
  }), [effectiveSeason, storedSeason, mode, detectedSeason, previewSeason, animations,
       isAnimationEnabled, setSeason, setMode, setAnimationEnabled, preview, clearPreview, resetToDefault]);

  return (
    <SeasonThemeContext.Provider value={value}>
      {children}
    </SeasonThemeContext.Provider>
  );
};
