import { createTheme } from '@mui/material/styles';

// ─── Paleta de marca (LIA - Zapatos) ──────────────────────────────────────────
// Colores primarios (lila/malva — identidad de LIA)
export const BRAND_COLORS = {
  primary: '#B8A5C8',           // lila principal
  primaryLight: '#D4C9E0',      // lila claro
  primaryDark: '#9A86AC',       // lila oscuro
  primaryBg: '#F5F0FA',         // fondo suave lila
  primaryAlpha10: 'rgba(184,165,200,0.1)',
  primaryAlpha15: 'rgba(184,165,200,0.15)',
  primaryAlpha25: 'rgba(184,165,200,0.25)',
  primaryAlpha40: 'rgba(184,165,200,0.4)',
  primaryAlpha50: 'rgba(184,165,200,0.5)',
  // Color alternativo (rosa/morado oscuro usado en NavBar)
  accent: '#B8377D',
} as const;

// Neutros - Escala de grises completa
export const NEUTRAL_COLORS = {
  white: '#ffffff',
  offWhite: '#fafafa',
  // Grises muy claros (fondos)
  gray50: '#fdfdfd',
  gray75: '#f9fafb',
  gray100: '#f8f8f8',
  gray125: '#f7f7f7',
  gray150: '#f5f5f5',
  gray175: '#f1f5f9',
  // Grises medios (bordes, separadores)
  gray200: '#e2e8f0',
  gray300: '#dddddd',
  gray400: '#ccc',
  // Grises oscuros (textos)
  gray500: '#999999',
  gray600: '#666666',
  gray700: '#555555',
  textDark: '#333333',
  black: '#000000',
} as const;

// Semánticos e Indicadores
export const SEMANTIC_COLORS = {
  // Verde marca (decorativo, usado en líneas de Home y Footer)
  brandGreen: '#2c5f2d',
  // Verde success (MercadoLibre inspired)
  success: '#00a650',
  successBg: 'rgba(0,166,80,0.08)',
  successBorder: 'rgba(0,166,80,0.2)',
  // Rojo / Error
  error: '#ef4444',
  errorBg: 'rgba(239,68,68,0.08)',
  errorBorder: 'rgba(239,68,68,0.2)',
  // Azul primario (MercadoLibre inspired - botones principales)
  info: '#3483fa',
  infoHover: '#2968c8',
  infoDark: '#1f62c2',
  infoBg: 'rgba(52,131,250,0.08)',
  infoBorder: 'rgba(52,131,250,0.2)',
  // Azul celeste (MercadoPago)
  infoSecondary: '#009ee3',
} as const;

export const theme = createTheme({
  palette: {
    primary: {
      main: BRAND_COLORS.primary,
      light: BRAND_COLORS.primaryLight,
      dark: BRAND_COLORS.primaryDark,
    },
    secondary: {
      main: BRAND_COLORS.accent,
    },
    text: {
      primary: NEUTRAL_COLORS.textDark,
      secondary: NEUTRAL_COLORS.gray600,
    },
    background: {
      default: NEUTRAL_COLORS.white,
      paper: NEUTRAL_COLORS.white,
    },
    error: {
      main: SEMANTIC_COLORS.error,
    },
    success: {
      main: SEMANTIC_COLORS.success,
    },
    info: {
      main: SEMANTIC_COLORS.info,
    },
  },
  typography: {
    fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  shape: {
    borderRadius: 8,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 480,
      md: 768,
      lg: 1024,
      xl: 1400,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          color: NEUTRAL_COLORS.textDark,
          backgroundColor: NEUTRAL_COLORS.white,
        },
      },
    },
  },
});
