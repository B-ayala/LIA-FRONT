import { useEffect, useState } from 'react';
import { Check, EyeOff, Globe, Palette, RefreshCw, Save, Sparkles } from 'lucide-react';
import { supabase } from '../../../config/supabaseClient';
import { useSeasonTheme } from '../../../utils/SeasonThemeProvider';
import {
  SEASON_LIST,
  SEASONS,
  isSeasonId,
  type SeasonId,
} from '../../../utils/seasonThemes';
import './ThemesManager.css';

// Tabla `site_content` (key='season_theme') guarda la preferencia global —
// reusamos el mismo patrón que FooterEditor para no introducir una tabla nueva.
const REMOTE_KEY = 'season_theme';

interface RemoteThemePref {
  season: SeasonId;
  appliedAt: string;
}

const ThemesManager = () => {
  const {
    season,
    storedSeason,
    mode,
    detectedSeason,
    isPreviewing,
    animations,
    setSeason,
    setMode,
    setAnimationEnabled,
    preview,
    clearPreview,
  } = useSeasonTheme();

  const [remoteSeason, setRemoteSeason] = useState<SeasonId | null>(null);
  const [savingRemote, setSavingRemote] = useState(false);
  const [saved, setSaved] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('value')
        .eq('key', REMOTE_KEY)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        // No bloquea la UI — el panel sigue siendo usable con sólo la pref local.
        setRemoteError('No se pudo leer la preferencia global.');
        return;
      }
      const value = data?.value as Partial<RemoteThemePref> | null;
      if (value && isSeasonId(value.season)) {
        setRemoteSeason(value.season);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleApply = (id: SeasonId) => {
    setSeason(id);
    clearPreview();
  };

  const handlePublishGlobal = async () => {
    setSavingRemote(true);
    setRemoteError(null);
    const payload: RemoteThemePref = {
      season: storedSeason,
      appliedAt: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('site_content')
      .upsert({ key: REMOTE_KEY, value: payload, updated_at: new Date().toISOString() });
    setSavingRemote(false);
    if (error) {
      setRemoteError('No se pudo guardar para todos los usuarios.');
      return;
    }
    setRemoteSeason(storedSeason);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="themes-manager">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Palette size={22} aria-hidden="true" /> Temas estacionales
        </h1>
        <p className="admin-page-subtitle">
          Cambiá la identidad visual del sitio según la estación del año. Los cambios se aplican en tiempo real.
        </p>
      </div>

      <section className="themes-mode-card" aria-labelledby="themes-mode-title">
        <div className="themes-mode-text">
          <h2 id="themes-mode-title">Modo de selección</h2>
          <p>
            <strong>Automático</strong> sigue la fecha actual ({SEASONS[detectedSeason].label}).
            <strong> Manual</strong> mantiene la estación que elijas.
          </p>
        </div>
        <div className="themes-mode-toggle" role="radiogroup" aria-label="Modo de selección de tema">
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'auto'}
            className={`themes-mode-btn ${mode === 'auto' ? 'active' : ''}`}
            onClick={() => setMode('auto')}
          >
            <Sparkles size={16} aria-hidden="true" /> Automático
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'manual'}
            className={`themes-mode-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            <Palette size={16} aria-hidden="true" /> Manual
          </button>
        </div>
      </section>

      <section aria-labelledby="themes-grid-title">
        <h2 id="themes-grid-title" className="themes-grid-title">
          Estaciones disponibles
          {isPreviewing && (
            <span className="themes-preview-badge" aria-live="polite">
              Previsualizando — pasá el mouse fuera para volver
            </span>
          )}
        </h2>
        <div className="themes-grid">
          {SEASON_LIST.map((s) => {
            const isActive = season === s.id;
            const isStored = storedSeason === s.id && mode === 'manual';
            const isRemote = remoteSeason === s.id;
            const animationEnabled = animations[s.id];
            const toggleId = `anim-toggle-${s.id}`;
            return (
              <article
                key={s.id}
                className={`theme-card ${isActive ? 'is-active' : ''}`}
                onMouseEnter={() => preview(s.id)}
                onMouseLeave={clearPreview}
                onFocus={() => preview(s.id)}
                onBlur={clearPreview}
                tabIndex={0}
                aria-label={`Tema ${s.label}`}
              >
                <header className="theme-card-header">
                  <span className="theme-card-emoji" aria-hidden="true">{s.emoji}</span>
                  <div className="theme-card-titles">
                    <h3>{s.label}</h3>
                    <p>{s.description}</p>
                  </div>
                </header>

                <div
                  className="theme-card-preview"
                  style={{
                    background: s.palette.primaryBg,
                    color: s.palette.textDark,
                    borderColor: s.palette.primaryLight,
                  }}
                  aria-hidden="true"
                >
                  <div className="theme-card-swatches">
                    <span style={{ background: s.palette.primary }} title="Primario" />
                    <span style={{ background: s.palette.primaryLight }} title="Primario claro" />
                    <span style={{ background: s.palette.primaryDark }} title="Primario oscuro" />
                    <span style={{ background: s.palette.accent }} title="Acento" />
                  </div>
                  <div className="theme-card-mock">
                    <button
                      type="button"
                      className="theme-card-mock-btn"
                      style={{ background: s.palette.primary, color: '#fff' }}
                      tabIndex={-1}
                    >
                      Comprar ahora
                    </button>
                    <span
                      className="theme-card-mock-tag"
                      style={{ background: s.palette.accent, color: '#fff' }}
                    >
                      Nuevo
                    </span>
                  </div>
                </div>

                {s.hasParticles ? (
                  <label
                    className="theme-card-animation"
                    htmlFor={toggleId}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="theme-card-animation-label">
                      <Sparkles size={14} aria-hidden="true" />
                      Animación de fondo
                    </span>
                    <input
                      id={toggleId}
                      type="checkbox"
                      className="theme-card-animation-input"
                      checked={animationEnabled}
                      onChange={(e) => setAnimationEnabled(s.id, e.target.checked)}
                    />
                    <span className="theme-card-animation-switch" aria-hidden="true" />
                  </label>
                ) : (
                  <div className="theme-card-animation is-disabled" aria-hidden="true">
                    <span className="theme-card-animation-label">
                      <EyeOff size={14} aria-hidden="true" />
                      Sin animación
                    </span>
                  </div>
                )}

                <footer className="theme-card-footer">
                  <div className="theme-card-meta">
                    {isStored && <span className="theme-card-chip is-applied"><Check size={12} /> Aplicado</span>}
                    {isRemote && <span className="theme-card-chip is-global"><Globe size={12} /> Global</span>}
                  </div>
                  <button
                    type="button"
                    className="theme-card-apply"
                    onClick={() => handleApply(s.id)}
                    disabled={isStored}
                  >
                    {isStored ? 'En uso' : 'Aplicar'}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      </section>

      <section className="themes-publish-card" aria-labelledby="themes-publish-title">
        <div>
          <h2 id="themes-publish-title">
            <Globe size={18} aria-hidden="true" /> Aplicar a todos los usuarios
          </h2>
          <p>
            Publica la estación seleccionada (<strong>{SEASONS[storedSeason].label}</strong>) como predeterminada
            para todos los visitantes. Cada usuario podrá seguir personalizándola desde su navegador.
          </p>
          {remoteError && <p className="themes-error" role="alert">{remoteError}</p>}
          {saved && <p className="themes-success" role="status"><Check size={14} /> Preferencia global guardada.</p>}
        </div>
        <button
          type="button"
          className="themes-publish-btn"
          onClick={handlePublishGlobal}
          disabled={savingRemote}
        >
          {savingRemote
            ? <><RefreshCw size={16} className="spin" aria-hidden="true" /> Guardando…</>
            : <><Save size={16} aria-hidden="true" /> Guardar para todos</>}
        </button>
      </section>
    </div>
  );
};

export default ThemesManager;
