export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_6 = /^#[0-9a-f]{6}$/i;

// Colores sugeridos por el selector "Automático": los dos extremos que sirven
// de texto sobre casi cualquier fondo.
export const NAVBAR_LIGHT_TEXT = '#ffffff';
export const NAVBAR_DARK_TEXT = '#333333';

// Nivel mínimo de contraste (WCAG) para texto normal / texto grande.
export const CONTRAST_GOOD = 4.5;
export const CONTRAST_FAIR = 3;

const MAX_CHANNEL = 255;
const SRGB_LINEAR_THRESHOLD = 0.03928;

// Lo que llega de la base se valida: este valor termina en un estilo CSS.
export const parseNavbarColor = (value: unknown): string | null =>
  typeof value === 'string' && HEX_6.test(value) ? value.toLowerCase() : null;

export function hexToRgb(hex: string): Rgb | null {
  if (!HEX_6.test(hex)) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

const toLinear = (channel: number): number => {
  const unit = channel / MAX_CHANNEL;
  return unit <= SRGB_LINEAR_THRESHOLD ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

const luminance = ({ r, g, b }: Rgb): number =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

export function pickReadableTextColor(background: Rgb): string {
  const light = hexToRgb(NAVBAR_LIGHT_TEXT);
  const dark = hexToRgb(NAVBAR_DARK_TEXT);
  if (!light || !dark) return NAVBAR_DARK_TEXT;
  return contrastRatio(light, background) >= contrastRatio(dark, background) ? NAVBAR_LIGHT_TEXT : NAVBAR_DARK_TEXT;
}

export const averageRgb = (colors: Rgb[]): Rgb => {
  const total = colors.length || 1;
  const sum = colors.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }), { r: 0, g: 0, b: 0 });
  return { r: Math.round(sum.r / total), g: Math.round(sum.g / total), b: Math.round(sum.b / total) };
};

export type ContrastLevel = 'good' | 'fair' | 'poor';

export const contrastLevel = (ratio: number): ContrastLevel =>
  ratio >= CONTRAST_GOOD ? 'good' : ratio >= CONTRAST_FAIR ? 'fair' : 'poor';
