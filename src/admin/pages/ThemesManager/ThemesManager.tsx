import { useEffect, useState } from 'react';
import { Check, EyeOff, Globe, Palette, Pencil, Plus, RefreshCw, RotateCcw, Save, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '../../../config/supabaseClient';
import { useSeasonTheme } from '../../../utils/SeasonThemeProvider';
import { useTypography } from '../../../utils/TypographyProvider';
import {
  DEFAULT_CUSTOM_PALETTE,
  SEASON_LIST,
  SEASONS,
  isSeasonId,
  type CustomTheme,
  type SeasonId,
  type SeasonPalette,
} from '../../../utils/seasonThemes';
import TypographySection from './TypographySection';
import ConfirmationModal from '../../../components/common/Modal/ConfirmationModal';
import './ThemesManager.css';

// Tabla `site_content` (key='season_theme') guarda la preferencia global —
// reusamos el mismo patrón que FooterEditor para no introducir una tabla nueva.
const REMOTE_KEY = 'season_theme';

interface RemoteThemePref {
  season: SeasonId;
  appliedAt: string;
  customPalette?: SeasonPalette;
}

const CUSTOM_COLOR_FIELDS: { field: keyof SeasonPalette; label: string }[] = [
  { field: 'primary', label: 'Primario' },
  { field: 'primaryLight', label: 'Primario claro' },
  { field: 'primaryDark', label: 'Primario oscuro' },
  { field: 'primaryBg', label: 'Fondo' },
  { field: 'accent', label: 'Acento' },
  { field: 'textDark', label: 'Texto' },
];

const ThemesManager = () => {
  const {
    season,
    storedSeason,
    mode,
    detectedSeason,
    isPreviewing,
    animations,
    customThemes,
    activeCustomThemeId,
    setSeason,
    setMode,
    setAnimationEnabled,
    saveCustomTheme,
    deleteCustomTheme,
    applyCustomTheme,
    previewCustomPalette,
    preview,
    clearPreview,
  } = useSeasonTheme();

  const {
    publishGlobal: publishTypography,
    publishState: typoPublishState,
    publishError: typoPublishError,
  } = useTypography();

  const [remoteSeason, setRemoteSeason] = useState<SeasonId | null>(null);
  const [remoteCustomPalette, setRemoteCustomPalette] = useState<SeasonPalette | null>(null);
  const [savingRemote, setSavingRemote] = useState(false);
  const [saved, setSaved] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  // ─── Editor de temas personalizados (crear / editar) ────────────────────────
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftPalette, setDraftPalette] = useState<SeasonPalette>(DEFAULT_CUSTOM_PALETTE);
  const [deleteTarget, setDeleteTarget] = useState<CustomTheme | null>(null);

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
        setRemoteCustomPalette(value.customPalette ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleApply = (id: SeasonId) => {
    setSeason(id);
    clearPreview();
  };

  const saveThemeGlobal = async () => {
    setSavingRemote(true);
    setRemoteError(null);
    const activeCustom = customThemes.find((t) => t.id === activeCustomThemeId);
    const payload: RemoteThemePref = {
      season: storedSeason,
      appliedAt: new Date().toISOString(),
      ...(storedSeason === 'custom' && activeCustom ? { customPalette: activeCustom.palette } : {}),
    };
    const { error } = await supabase
      .from('site_content')
      .upsert({ key: REMOTE_KEY, value: payload, updated_at: new Date().toISOString() });
    setSavingRemote(false);
    if (error) {
      setRemoteError('No se pudo guardar el tema para todos los usuarios.');
      return;
    }
    setRemoteSeason(storedSeason);
    setRemoteCustomPalette(payload.customPalette ?? null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveAll = () => {
    void Promise.all([saveThemeGlobal(), publishTypography()]);
  };

  const isSamePalette = (a: SeasonPalette, b: SeasonPalette) =>
    CUSTOM_COLOR_FIELDS.every(({ field }) => a[field]?.toLowerCase() === b[field]?.toLowerCase())
    && a.surface?.toLowerCase() === b.surface?.toLowerCase();

  const openCreateEditor = () => {
    setEditingId(null);
    setDraftName('');
    setDraftPalette({ ...DEFAULT_CUSTOM_PALETTE });
    setIsEditorOpen(true);
    previewCustomPalette({ ...DEFAULT_CUSTOM_PALETTE });
  };

  const openEditEditor = (theme: CustomTheme) => {
    setEditingId(theme.id);
    setDraftName(theme.name);
    setDraftPalette(theme.palette);
    setIsEditorOpen(true);
    previewCustomPalette(theme.palette);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    clearPreview();
  };

  const updateDraftColor = (field: keyof SeasonPalette, value: string) => {
    setDraftPalette((prev) => {
      const next = { ...prev, [field]: value };
      previewCustomPalette(next);
      return next;
    });
  };

  const resetDraftColors = () => {
    setDraftPalette({ ...DEFAULT_CUSTOM_PALETTE });
    previewCustomPalette({ ...DEFAULT_CUSTOM_PALETTE });
  };

  const handleSaveDraft = () => {
    if (!draftName.trim()) return;
    const id = saveCustomTheme({ id: editingId ?? undefined, name: draftName, palette: draftPalette });
    if (activeCustomThemeId === id) {
      applyCustomTheme(id);
    }
    closeEditor();
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteCustomTheme(deleteTarget.id);
    if (editingId === deleteTarget.id) closeEditor();
    setDeleteTarget(null);
  };

  const activeLabel = storedSeason === 'custom'
    ? (customThemes.find((t) => t.id === activeCustomThemeId)?.name ?? 'Personalizado')
    : SEASONS[storedSeason].label;

  return (
    <div className="themes-manager">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Palette size={22} aria-hidden="true" /> Temas / Tipografía
        </h1>
        <p className="admin-page-subtitle">
          Personalizá la identidad visual del sitio: elegí un tema de color, ajustá la tipografía y publicá los cambios para todos los usuarios.
        </p>
      </div>

      <section className="themes-mode-card" aria-labelledby="themes-mode-title">
        <div className="themes-mode-text">
          <h2 id="themes-mode-title">Modo de selección</h2>
          <p>
            <strong>Automático</strong> sigue la fecha actual ({SEASONS[detectedSeason].label}).
            <strong> Manual</strong> mantiene el tema que elijas.
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
          Temas disponibles
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
            const palette = s.palette;
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
                    background: palette.primaryBg,
                    color: palette.textDark,
                    borderColor: palette.primaryLight,
                  }}
                  aria-hidden="true"
                >
                  <div className="theme-card-swatches">
                    <span style={{ background: palette.primary }} title="Primario" />
                    <span style={{ background: palette.primaryLight }} title="Primario claro" />
                    <span style={{ background: palette.primaryDark }} title="Primario oscuro" />
                    <span style={{ background: palette.accent }} title="Acento" />
                  </div>
                  <div className="theme-card-mock">
                    <button
                      type="button"
                      className="theme-card-mock-btn"
                      style={{ background: palette.primary, color: '#fff' }}
                      tabIndex={-1}
                    >
                      Comprar ahora
                    </button>
                    <span
                      className="theme-card-mock-tag"
                      style={{ background: palette.accent, color: '#fff' }}
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

      <section className="themes-custom-card" aria-labelledby="themes-custom-title">
        <div className="themes-custom-header">
          <h2 id="themes-custom-title">
            <Palette size={18} aria-hidden="true" /> Tus temas personalizados
          </h2>
          <p>
            Creá tus propias combinaciones de colores, guardalas con nombre, aplicalas cuando quieras
            y borrá las que ya no uses.
          </p>
        </div>

        {customThemes.length > 0 && (
          <div className="themes-grid">
            {customThemes.map((theme) => {
              const isStored = storedSeason === 'custom' && activeCustomThemeId === theme.id && mode === 'manual';
              const isActive = season === 'custom' && activeCustomThemeId === theme.id;
              const isRemote = remoteSeason === 'custom' && !!remoteCustomPalette && isSamePalette(remoteCustomPalette, theme.palette);
              const palette = theme.palette;
              return (
                <article
                  key={theme.id}
                  className={`theme-card ${isActive ? 'is-active' : ''}`}
                  onMouseEnter={() => previewCustomPalette(theme.palette)}
                  onMouseLeave={clearPreview}
                  onFocus={() => previewCustomPalette(theme.palette)}
                  onBlur={clearPreview}
                  tabIndex={0}
                  aria-label={`Tema personalizado ${theme.name}`}
                >
                  <header className="theme-card-header">
                    <span className="theme-card-emoji" aria-hidden="true">🎨</span>
                    <div className="theme-card-titles">
                      <h3>{theme.name}</h3>
                      <p>Tu tema personalizado.</p>
                    </div>
                  </header>

                  <div
                    className="theme-card-preview"
                    style={{
                      background: palette.primaryBg,
                      color: palette.textDark,
                      borderColor: palette.primaryLight,
                    }}
                    aria-hidden="true"
                  >
                    <div className="theme-card-swatches">
                      <span style={{ background: palette.primary }} title="Primario" />
                      <span style={{ background: palette.primaryLight }} title="Primario claro" />
                      <span style={{ background: palette.primaryDark }} title="Primario oscuro" />
                      <span style={{ background: palette.accent }} title="Acento" />
                    </div>
                    <div className="theme-card-mock">
                      <button
                        type="button"
                        className="theme-card-mock-btn"
                        style={{ background: palette.primary, color: '#fff' }}
                        tabIndex={-1}
                      >
                        Comprar ahora
                      </button>
                      <span
                        className="theme-card-mock-tag"
                        style={{ background: palette.accent, color: '#fff' }}
                      >
                        Nuevo
                      </span>
                    </div>
                  </div>

                  <div className="theme-card-custom-actions">
                    <button
                      type="button"
                      className="theme-card-icon-btn"
                      onClick={(e) => { e.stopPropagation(); openEditEditor(theme); }}
                      aria-label={`Editar ${theme.name}`}
                      title="Editar"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="theme-card-icon-btn is-danger"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(theme); }}
                      aria-label={`Eliminar ${theme.name}`}
                      title="Eliminar"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>

                  <footer className="theme-card-footer">
                    <div className="theme-card-meta">
                      {isStored && <span className="theme-card-chip is-applied"><Check size={12} /> Aplicado</span>}
                      {isRemote && <span className="theme-card-chip is-global"><Globe size={12} /> Global</span>}
                    </div>
                    <button
                      type="button"
                      className="theme-card-apply"
                      onClick={() => { applyCustomTheme(theme.id); clearPreview(); }}
                      disabled={isStored}
                    >
                      {isStored ? 'En uso' : 'Aplicar'}
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        )}

        {customThemes.length === 0 && !isEditorOpen && (
          <p className="themes-custom-empty">Todavía no creaste ningún tema personalizado.</p>
        )}

        {!isEditorOpen && (
          <button type="button" className="themes-custom-add-btn" onClick={openCreateEditor}>
            <Plus size={16} aria-hidden="true" /> Crear tema personalizado
          </button>
        )}

        {isEditorOpen && (
          <div className="themes-custom-editor">
            <label className="themes-custom-name">
              <span>Nombre del tema</span>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Ej: Verano rosa"
                maxLength={40}
                autoFocus
              />
            </label>
            <div className="themes-custom-fields">
              {CUSTOM_COLOR_FIELDS.map(({ field, label }) => (
                <label key={field} className="themes-custom-field">
                  <span>{label}</span>
                  <div className="themes-custom-field-input">
                    <input
                      type="color"
                      value={draftPalette[field]}
                      onChange={(e) => updateDraftColor(field, e.target.value)}
                      aria-label={label}
                    />
                    <input
                      type="text"
                      value={draftPalette[field]}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(raw)) updateDraftColor(field, raw);
                      }}
                      maxLength={7}
                      spellCheck={false}
                      aria-label={`${label} (código hex)`}
                    />
                  </div>
                </label>
              ))}
            </div>
            <div className="themes-custom-actions">
              <button
                type="button"
                className="theme-card-apply"
                onClick={handleSaveDraft}
                disabled={!draftName.trim()}
              >
                {editingId ? 'Guardar cambios' : 'Guardar tema'}
              </button>
              <button type="button" className="themes-custom-reset" onClick={resetDraftColors}>
                <RotateCcw size={14} aria-hidden="true" /> Restablecer colores
              </button>
              <button type="button" className="themes-custom-cancel" onClick={closeEditor}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <hr className="themes-divider" aria-hidden="true" />

      <TypographySection />

      <section className="themes-publish-card" aria-labelledby="themes-publish-title">
        <div>
          <h2 id="themes-publish-title">
            <Globe size={18} aria-hidden="true" /> Guardar para todos los usuarios
          </h2>
          <p>
            Publica el tema <strong>{activeLabel}</strong> y la tipografía seleccionada
            como predeterminados para todos los visitantes. Cada usuario podrá seguir personalizándolos
            desde su navegador.
          </p>
          {remoteError && <p className="themes-error" role="alert">{remoteError}</p>}
          {typoPublishError && <p className="themes-error" role="alert">{typoPublishError}</p>}
          {(saved || typoPublishState === 'saved') && (
            <p className="themes-success" role="status">
              <Check size={14} /> Cambios guardados para todos los usuarios.
            </p>
          )}
        </div>
        <button
          type="button"
          className="themes-publish-btn"
          onClick={handleSaveAll}
          disabled={savingRemote || typoPublishState === 'saving'}
        >
          {(savingRemote || typoPublishState === 'saving')
            ? <><RefreshCw size={16} className="spin" aria-hidden="true" /> Guardando…</>
            : <><Save size={16} aria-hidden="true" /> Guardar para todos</>}
        </button>
      </section>

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar tema personalizado"
        message={`¿Estás seguro de que querés eliminar "${deleteTarget?.name ?? ''}"? Esta acción no se puede deshacer.`}
        status="error"
        actionButtonText="Eliminar"
        cancelButtonText="Cancelar"
        onActionClick={handleDeleteConfirm}
      />
    </div>
  );
};

export default ThemesManager;
