import { RotateCcw, Type } from 'lucide-react';
import { FONT_OPTIONS, useTypography } from '../../../utils/TypographyProvider';
import './TypographySection.css';

// ─── Subcomponents ────────────────────────────────────────────────────────────

const WEIGHT_LABELS: Record<number, string> = {
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
};

interface PreviewProps {
  fontFamily: string;
  fontWeight: number;
  letterSpacing: string;
  lineHeight: number;
}

const TypographyPreview = ({ fontFamily, fontWeight, letterSpacing, lineHeight }: PreviewProps) => (
  <div
    className="typo-preview"
    style={{ fontFamily, fontWeight, letterSpacing, lineHeight }}
    aria-label="Vista previa de la tipografía"
    aria-live="polite"
  >
    <p className="typo-preview-heading">Damiana Bella</p>
    <p className="typo-preview-sub">La moda que te identifica</p>
    <p className="typo-preview-body">
      Descubrí nuestra colección de temporada — ropa femenina con diseño argentino,
      calidad premium y envío a todo el país.
    </p>
  </div>
);

interface RangeFieldProps {
  label: string;
  valueBadge: string;
  min: number;
  max: number;
  step: number;
  value: number;
  minLabel: string;
  maxLabel: string;
  ariaLabel: string;
  onChange: (v: number) => void;
}

const RangeField = ({
  label, valueBadge, min, max, step, value, minLabel, maxLabel, ariaLabel, onChange,
}: RangeFieldProps) => (
  <div className="typo-field">
    <label className="typo-label">
      {label}
      <span className="typo-value-badge">{valueBadge}</span>
    </label>
    <input
      type="range"
      className="typo-range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      aria-label={ariaLabel}
    />
    <div className="typo-range-labels">
      <span>{minLabel}</span>
      <span>{maxLabel}</span>
    </div>
  </div>
);

// ─── Main section ─────────────────────────────────────────────────────────────

const TypographySection = () => {
  const {
    config,
    activeFont,
    setConfig,
    resetConfig,
    userLayoutStyle,
  } = useTypography();

  const handleFontSelect = (fontId: string) => {
    const font = FONT_OPTIONS.find((f) => f.id === fontId);
    if (!font) return;
    const compatibleWeight = font.weights.includes(config.fontWeight)
      ? config.fontWeight
      : (font.weights.find((w) => w >= 400) ?? font.weights[0]);
    setConfig({ fontId, fontWeight: compatibleWeight });
  };

  const letterSpacingBadge = config.letterSpacing === 0
    ? 'normal'
    : `${config.letterSpacing > 0 ? '+' : ''}${config.letterSpacing.toFixed(2)}em`;

  return (
    <section className="typo-section" aria-labelledby="typo-section-title">
      <div className="typo-section-header">
        <h2 id="typo-section-title">
          <Type size={18} aria-hidden="true" /> Tipografía
        </h2>
        <p>
          Personalizá la familia tipográfica del sitio. Los tamaños y la jerarquía
          visual se mantienen intactos.
        </p>
      </div>

      <TypographyPreview
        fontFamily={String(userLayoutStyle.fontFamily ?? activeFont.family)}
        fontWeight={config.fontWeight}
        letterSpacing={String(userLayoutStyle.letterSpacing ?? 'normal')}
        lineHeight={config.lineHeight}
      />

      {/* Font family picker */}
      <div className="typo-field">
        <label className="typo-label">Familia tipográfica</label>
        <div className="typo-fonts-grid" role="listbox" aria-label="Seleccionar fuente">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.id}
              type="button"
              role="option"
              className={`typo-font-card ${config.fontId === font.id ? 'is-active' : ''}`}
              onClick={() => handleFontSelect(font.id)}
              aria-selected={config.fontId === font.id}
            >
              <span className="typo-font-name" style={{ fontFamily: font.family }}>
                {font.label}
              </span>
              <span className="typo-font-sample" style={{ fontFamily: font.family }}>
                Aa Bb Cc
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Weight + sliders */}
      <div className="typo-controls-row">
        <div className="typo-field">
          <label className="typo-label">Peso del texto base</label>
          <div className="typo-weight-group" role="group" aria-label="Peso tipográfico">
            {activeFont.weights.map((w) => (
              <button
                key={w}
                type="button"
                className={`typo-weight-btn ${config.fontWeight === w ? 'is-active' : ''}`}
                onClick={() => setConfig({ fontWeight: w })}
                aria-pressed={config.fontWeight === w}
                style={{ fontWeight: w, fontFamily: activeFont.family }}
              >
                {WEIGHT_LABELS[w] ?? w}
              </button>
            ))}
          </div>
        </div>

        <RangeField
          label="Espaciado entre letras"
          valueBadge={letterSpacingBadge}
          min={-0.02}
          max={0.15}
          step={0.01}
          value={config.letterSpacing}
          minLabel="Compacto"
          maxLabel="Aireado"
          ariaLabel="Espaciado entre letras"
          onChange={(v) => setConfig({ letterSpacing: v })}
        />

        <RangeField
          label="Altura de línea"
          valueBadge={config.lineHeight.toFixed(1)}
          min={1.2}
          max={2.0}
          step={0.1}
          value={config.lineHeight}
          minLabel="Compacto"
          maxLabel="Espaciado"
          ariaLabel="Altura de línea"
          onChange={(v) => setConfig({ lineHeight: v })}
        />
      </div>

      {/* Actions */}
      <div className="typo-actions">
        <button type="button" className="typo-reset-btn" onClick={resetConfig}>
          <RotateCcw size={15} aria-hidden="true" /> Resetear tipografía
        </button>
      </div>
    </section>
  );
};

export default TypographySection;
