// ─── Temas estacionales ───────────────────────────────────────────────────────
// Define la paleta de cada estación y la metadata usada por el panel admin.
// Los valores se aplican como CSS custom properties — el override real vive
// en `seasons.css` y se activa por el atributo `data-season` en <html>.
//
// El id 'default' representa la identidad original de marca (lila LIA) y no
// muestra animaciones — es la opción neutra para el admin que quiera volver
// al estado previo al sistema estacional.
//
// Para agregar una estación nueva: añadir entrada en SEASONS + bloque en
// seasons.css con el mismo id. El resto del flujo (preview, apply, persistencia)
// es data-driven.

export type SeasonId =
  | 'default'
  | 'mono'
  | 'rose'
  | 'emerald'
  | 'ocean'
  | 'burgundy'
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'custom';
export type ThemeMode = 'auto' | 'manual';

export interface SeasonPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryBg: string;
  accent: string;
  surface: string;
  textDark: string;
}

export interface SeasonTheme {
  id: SeasonId;
  label: string;
  description: string;
  emoji: string;
  palette: SeasonPalette;
  // Meses (1-12) en hemisferio sur (Argentina) — usados por el modo automático.
  // 'default' deja meses vacíos: nunca se selecciona por detección automática,
  // sólo de forma manual.
  months: number[];
  // Si una estación no tiene partículas, el backdrop no se renderiza.
  hasParticles: boolean;
  // El admin edita su paleta a mano (color pickers) — la tarjeta de la grilla
  // usa `customPalette` del provider en vez de `palette` para el preview.
  isCustom?: boolean;
}

export const SEASONS: Record<SeasonId, SeasonTheme> = {
  default: {
    id: 'default',
    label: 'Clásico',
    description: 'Paleta original LIA — lila y malva, sin animaciones.',
    emoji: '💜',
    palette: {
      primary: '#B8A5C8',
      primaryLight: '#D4C9E0',
      primaryDark: '#9A86AC',
      primaryBg: '#F5F0FA',
      accent: '#B8377D',
      surface: '#FFFFFF',
      textDark: '#333333',
    },
    months: [],
    hasParticles: false,
  },
  mono: {
    id: 'mono',
    label: 'Blanco y Negro',
    description: 'Monocromático sobrio — negro, blanco y grises, estilo del panel.',
    emoji: '🖤',
    palette: {
      primary: '#171717',
      primaryLight: '#E5E5E5',
      primaryDark: '#000000',
      primaryBg: '#FAFAFA',
      accent: '#000000',
      surface: '#FFFFFF',
      textDark: '#0A0A0A',
    },
    months: [],
    hasParticles: false,
  },
  rose: {
    id: 'rose',
    label: 'Rosa',
    description: 'Rosa vibrante con acentos borravino, elegante y femenino.',
    emoji: '🌹',
    palette: {
      primary: '#D6558C',
      primaryLight: '#F2A8C4',
      primaryDark: '#A83464',
      primaryBg: '#FDF0F5',
      accent: '#7A2048',
      surface: '#FFFFFF',
      textDark: '#3A1626',
    },
    months: [],
    hasParticles: false,
  },
  emerald: {
    id: 'emerald',
    label: 'Esmeralda',
    description: 'Verde esmeralda profundo con acentos dorados.',
    emoji: '💎',
    palette: {
      primary: '#1E8A5F',
      primaryLight: '#7ED9AE',
      primaryDark: '#0F5C3D',
      primaryBg: '#EAFBF3',
      accent: '#C9A227',
      surface: '#FFFFFF',
      textDark: '#0E2A1F',
    },
    months: [],
    hasParticles: false,
  },
  ocean: {
    id: 'ocean',
    label: 'Océano',
    description: 'Azules profundos con un acento coral cálido.',
    emoji: '🌊',
    palette: {
      primary: '#1878A8',
      primaryLight: '#7FC4E0',
      primaryDark: '#0E4A66',
      primaryBg: '#EAF6FB',
      accent: '#F2994A',
      surface: '#FFFFFF',
      textDark: '#0B2836',
    },
    months: [],
    hasParticles: false,
  },
  burgundy: {
    id: 'burgundy',
    label: 'Borravino',
    description: 'Vino tinto profundo con acentos dorados, look premium.',
    emoji: '🍷',
    palette: {
      primary: '#7A2048',
      primaryLight: '#C97A9C',
      primaryDark: '#4A1129',
      primaryBg: '#FBEFF3',
      accent: '#C9A227',
      surface: '#FFFFFF',
      textDark: '#2A0E18',
    },
    months: [],
    hasParticles: false,
  },
  spring: {
    id: 'spring',
    label: 'Primavera',
    description: 'Tonos verdes frescos con acentos florales.',
    emoji: '🌸',
    palette: {
      primary: '#7BB661',
      primaryLight: '#B8E0A6',
      primaryDark: '#4F8C3A',
      primaryBg: '#F2FBEC',
      accent: '#E58FB8',
      surface: '#FFFFFF',
      textDark: '#1F3A2A',
    },
    months: [9, 10, 11],
    hasParticles: true,
  },
  summer: {
    id: 'summer',
    label: 'Verano',
    description: 'Cálido y luminoso, amarillos y naranjas.',
    emoji: '☀️',
    palette: {
      primary: '#F4A100',
      primaryLight: '#FFD371',
      primaryDark: '#C97A00',
      primaryBg: '#FFF8E8',
      accent: '#E2522C',
      surface: '#FFFFFF',
      textDark: '#3A2A10',
    },
    months: [12, 1, 2],
    hasParticles: true,
  },
  autumn: {
    id: 'autumn',
    label: 'Otoño',
    description: 'Marrones cálidos y naranjas profundos.',
    emoji: '🍂',
    palette: {
      primary: '#B8612C',
      primaryLight: '#E29A6A',
      primaryDark: '#7E3F18',
      primaryBg: '#FBF1E6',
      accent: '#8B3A1F',
      surface: '#FFFFFF',
      textDark: '#3A2418',
    },
    months: [3, 4, 5],
    hasParticles: true,
  },
  winter: {
    id: 'winter',
    label: 'Invierno',
    description: 'Azules fríos y blancos, sensación nevada.',
    emoji: '❄️',
    palette: {
      primary: '#4F86C6',
      primaryLight: '#A8C8E8',
      primaryDark: '#2E5A94',
      primaryBg: '#EEF5FB',
      accent: '#1F3F66',
      surface: '#FFFFFF',
      textDark: '#1A2A40',
    },
    months: [6, 7, 8],
    hasParticles: true,
  },
  custom: {
    id: 'custom',
    label: 'Personalizado',
    description: 'Elegí tus propios colores desde el editor y guardalos.',
    emoji: '🎨',
    // Placeholder — la tarjeta de la grilla usa `customPalette` (provider) en
    // vez de este valor fijo para dibujar el preview.
    palette: {
      primary: '#B8A5C8',
      primaryLight: '#D4C9E0',
      primaryDark: '#9A86AC',
      primaryBg: '#F5F0FA',
      accent: '#B8377D',
      surface: '#FFFFFF',
      textDark: '#333333',
    },
    months: [],
    hasParticles: false,
    isCustom: true,
  },
};

// 'custom' queda fuera de esta lista a propósito: no es una tarjeta fija sino
// un modo — la grilla de temas personalizados del admin (múltiples, con nombre
// propio) se renderiza aparte a partir de `customThemes` (ver SeasonThemeProvider).
export const SEASON_LIST: SeasonTheme[] = [
  SEASONS.default,
  SEASONS.mono,
  SEASONS.rose,
  SEASONS.emerald,
  SEASONS.ocean,
  SEASONS.burgundy,
  SEASONS.spring,
  SEASONS.summer,
  SEASONS.autumn,
  SEASONS.winter,
];

// Un tema que el admin arma a mano en el editor de colores y guarda con nombre
// propio — puede haber varios, a diferencia de las estaciones fijas.
export interface CustomTheme {
  id: string;
  name: string;
  palette: SeasonPalette;
}

export const createCustomThemeId = (): string =>
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Paleta inicial del editor de colores personalizados — misma identidad que
// 'default' hasta que el admin la modifique.
export const DEFAULT_CUSTOM_PALETTE: SeasonPalette = { ...SEASONS.default.palette };

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '').trim();
  const normalized = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const bigint = Number.parseInt(normalized, 16);
  if (Number.isNaN(bigint) || normalized.length !== 6) return `rgba(0, 0, 0, ${alpha})`;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Traduce la paleta elegida a mano por el admin al mismo set de CSS custom
// properties que definen los bloques estáticos de `seasons.css` — se aplican
// como estilos inline en <html> porque, a diferencia de las estaciones fijas,
// no puede haber un bloque CSS pre-escrito para un color arbitrario.
export const buildCustomCssVars = (palette: SeasonPalette): Record<string, string> => ({
  '--primary-color': palette.primary,
  '--primary-light': palette.primaryLight,
  '--primary-dark': palette.primaryDark,
  '--primary-bg': palette.primaryBg,
  '--primary-accent': palette.accent,
  '--bg-light': palette.primaryBg,
  '--brand-green': palette.primaryDark,
  '--button-dark': palette.primaryDark,
  '--button-dark-hover': palette.primary,
  '--season-gradient': `linear-gradient(135deg, ${palette.primaryDark} 0%, ${palette.primary} 50%, ${palette.accent} 100%)`,
  '--season-soft': `linear-gradient(180deg, ${palette.primaryBg} 0%, ${palette.primaryLight} 100%)`,
  '--season-ribbon': `linear-gradient(90deg, ${palette.primaryDark}, ${palette.primary}, ${palette.accent})`,
  '--shadow-primary': `0 10px 30px ${hexToRgba(palette.primary, 0.35)}`,
  '--shadow-primary-hover': `0 15px 40px ${hexToRgba(palette.primary, 0.5)}`,
  '--shadow-2xl': `0 25px 80px -20px ${hexToRgba(palette.primary, 0.4)}, 0 15px 40px -10px rgba(0, 0, 0, 0.2)`,
});

export const CUSTOM_CSS_VAR_NAMES: string[] = Object.keys(buildCustomCssVars(DEFAULT_CUSTOM_PALETTE));

// Default global cuando no hay preferencia guardada. Usamos 'default' porque
// representa la identidad visual original de la marca.
export const DEFAULT_SEASON: SeasonId = 'default';

export const detectSeasonFromDate = (date: Date = new Date()): SeasonId => {
  const month = date.getMonth() + 1;
  // Buscamos sólo entre las 4 estaciones reales — 'default' no participa
  // del modo automático (tiene months: []).
  const found = SEASON_LIST.find((s) => s.months.includes(month));
  return found?.id ?? DEFAULT_SEASON;
};

export const isSeasonId = (value: unknown): value is SeasonId =>
  typeof value === 'string' && value in SEASONS;
