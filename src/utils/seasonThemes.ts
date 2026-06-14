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

export type SeasonId = 'default' | 'spring' | 'summer' | 'autumn' | 'winter';
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
};

export const SEASON_LIST: SeasonTheme[] = [
  SEASONS.default,
  SEASONS.spring,
  SEASONS.summer,
  SEASONS.autumn,
  SEASONS.winter,
];

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
