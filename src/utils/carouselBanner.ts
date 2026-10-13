import { buildCloudinaryUrl } from './cloudinary';
import { roundUpToWidthBucket } from './carouselImageUrl';

export type BannerDevice = 'desktop' | 'mobile';
export type BannerFont = 'sans' | 'serif';
export type BannerWeight = 400 | 600 | 800;
export type BannerAlign = 'left' | 'center' | 'right';

// Posiciones (x, y) y ancho (w) en % del lienzo; el elemento se ancla por su
// centro. Los tamaños de letra están en `cqw` (1 = 1% del ancho del lienzo)
// para que el banner escale entero con la pantalla sin recalcular nada.
interface BannerElementBase {
  id: string;
  x: number;
  y: number;
  w: number;
  rotation: number;
}

export interface BannerTextElement extends BannerElementBase {
  type: 'text';
  text: string;
  fontSize: number;
  weight: BannerWeight;
  color: string;
  align: BannerAlign;
  font: BannerFont;
}

export interface BannerButtonElement extends BannerElementBase {
  type: 'button';
  label: string;
  href: string;
  fontSize: number;
  background: string;
  color: string;
}

export interface BannerImageElement extends BannerElementBase {
  type: 'image';
  url: string;
  alt: string;
  h: number;
  framed: boolean;
  radius: number;
}

// Una línea vertical es una horizontal rotada 90°: así no hay un segundo modo.
export interface BannerLineElement extends BannerElementBase {
  type: 'line';
  thickness: number;
  color: string;
}

export type BannerElement = BannerTextElement | BannerButtonElement | BannerImageElement | BannerLineElement;
export type BannerElementType = BannerElement['type'];

export interface BannerDesign {
  background: string;
  gradientTo: string | null;
  backgroundImage: string | null;
  overlay: number;
  elements: BannerElement[];
}

export const BANNER_REFERENCE_WIDTH: Record<BannerDevice, number> = { desktop: 1600, mobile: 800 };

export const BANNER_LIMITS = {
  maxElements: 30,
  maxTextLength: 300,
  maxUrlLength: 2048,
  minWidth: 4,
  maxWidth: 100,
  minFontSize: 0.8,
  maxFontSize: 14,
  maxOverlay: 0.8,
} as const;

const DEFAULT_TEXT_COLOR = '#333333';
const DEFAULT_BACKGROUND = '#f2efec';
const DEFAULT_ACCENT = '#e8707f';
const PIXEL_DENSITY = 2;

// Paleta rápida del editor. Son datos guardados en el diseño (no estilos de
// componente), por eso viven acá y no en CSS.
export const BANNER_PALETTE: readonly { value: string; label: string }[] = [
  { value: '#ffffff', label: 'Blanco' },
  { value: '#f2efec', label: 'Hueso' },
  { value: '#f5f0fa', label: 'Lila claro' },
  { value: '#b8a5c8', label: 'Lila' },
  { value: '#9a86ac', label: 'Lila oscuro' },
  { value: '#b8377d', label: 'Fucsia' },
  { value: '#e8707f', label: 'Coral' },
  { value: '#f4c9a8', label: 'Durazno' },
  { value: '#333333', label: 'Grafito' },
  { value: '#000000', label: 'Negro' },
];

// ── Saneado (lo que viene de la base no se confía) ───────────────────────────

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const WEIGHTS: readonly BannerWeight[] = [400, 600, 800];
const ALIGNS: readonly BannerAlign[] = ['left', 'center', 'right'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const clampNumber = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

const expandHex = (hex: string): string =>
  hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;

const cleanColor = (value: unknown, fallback: string): string =>
  typeof value === 'string' && HEX_COLOR.test(value) ? expandHex(value.toLowerCase()) : fallback;

const cleanText = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.slice(0, maxLength) : '';

export const isSafeImageUrl = (value: string): boolean =>
  value.length <= BANNER_LIMITS.maxUrlLength && /^https:\/\//i.test(value);

// Solo rutas internas o https: bloquea `javascript:` y esquemas raros.
export const isSafeHref = (value: string): boolean =>
  value.length <= BANNER_LIMITS.maxUrlLength && (/^\/(?!\/)/.test(value) || /^https:\/\//i.test(value));

const cleanImageUrl = (value: unknown): string => {
  const url = typeof value === 'string' ? value.trim() : '';
  return isSafeImageUrl(url) ? url : '';
};

const cleanHref = (value: unknown): string => {
  const href = typeof value === 'string' ? value.trim() : '';
  return isSafeHref(href) ? href : '';
};

const pickOne = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const parseBase = (raw: Record<string, unknown>): BannerElementBase => ({
  id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 64) : crypto.randomUUID(),
  x: clampNumber(raw.x, 0, 100, 50),
  y: clampNumber(raw.y, 0, 100, 50),
  w: clampNumber(raw.w, BANNER_LIMITS.minWidth, BANNER_LIMITS.maxWidth, 40),
  rotation: clampNumber(raw.rotation, -180, 180, 0),
});

const parseFontSize = (value: unknown, fallback: number): number =>
  clampNumber(value, BANNER_LIMITS.minFontSize, BANNER_LIMITS.maxFontSize, fallback);

const parseElement = (raw: unknown): BannerElement | null => {
  if (!isRecord(raw)) return null;
  const base = parseBase(raw);

  switch (raw.type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        text: cleanText(raw.text, BANNER_LIMITS.maxTextLength),
        fontSize: parseFontSize(raw.fontSize, 2),
        weight: pickOne(raw.weight, WEIGHTS, 400),
        color: cleanColor(raw.color, DEFAULT_TEXT_COLOR),
        align: pickOne(raw.align, ALIGNS, 'center'),
        font: pickOne<BannerFont>(raw.font, ['sans', 'serif'], 'sans'),
      };
    case 'button':
      return {
        ...base,
        type: 'button',
        label: cleanText(raw.label, 60),
        href: cleanHref(raw.href),
        fontSize: parseFontSize(raw.fontSize, 1.4),
        background: cleanColor(raw.background, DEFAULT_TEXT_COLOR),
        color: cleanColor(raw.color, '#ffffff'),
      };
    case 'image':
      return {
        ...base,
        type: 'image',
        url: cleanImageUrl(raw.url),
        alt: cleanText(raw.alt, 120),
        h: clampNumber(raw.h, BANNER_LIMITS.minWidth, 100, 40),
        framed: raw.framed === true,
        radius: clampNumber(raw.radius, 0, 50, 0),
      };
    case 'line':
      return {
        ...base,
        type: 'line',
        thickness: clampNumber(raw.thickness, 0.05, 2, 0.2),
        color: cleanColor(raw.color, DEFAULT_TEXT_COLOR),
      };
    default:
      return null;
  }
};

export function parseBannerDesign(raw: unknown): BannerDesign | null {
  if (!isRecord(raw)) return null;
  const rawElements = Array.isArray(raw.elements) ? raw.elements.slice(0, BANNER_LIMITS.maxElements) : [];
  const gradientTo = typeof raw.gradientTo === 'string' && HEX_COLOR.test(raw.gradientTo)
    ? expandHex(raw.gradientTo.toLowerCase())
    : null;

  return {
    background: cleanColor(raw.background, DEFAULT_BACKGROUND),
    gradientTo,
    backgroundImage: cleanImageUrl(raw.backgroundImage) || null,
    overlay: clampNumber(raw.overlay, 0, BANNER_LIMITS.maxOverlay, 0),
    elements: rawElements.flatMap((element) => parseElement(element) ?? []),
  };
}

// ── Imágenes ─────────────────────────────────────────────────────────────────

// Mismos escalones de ancho que el resto del carrusel: pocas versiones
// calientes en el CDN en vez de una por banner.
export function buildBannerImageUrl(url: string, widthPercent: number, referenceWidth: number): string {
  const width = roundUpToWidthBucket(Math.round((widthPercent / 100) * referenceWidth * PIXEL_DENSITY));
  return buildCloudinaryUrl(url, { width, crop: 'limit', format: 'auto', quality: 'auto' });
}

export function bannerImageUrls(design: BannerDesign, referenceWidth: number): string[] {
  const urls: string[] = [];
  if (design.backgroundImage) {
    urls.push(buildBannerImageUrl(design.backgroundImage, 100, referenceWidth));
  }
  for (const element of design.elements) {
    if (element.type === 'image' && element.url) {
      urls.push(buildBannerImageUrl(element.url, element.w, referenceWidth));
    }
  }
  return urls;
}

// ── Fábricas del editor ──────────────────────────────────────────────────────

const newId = (): string => crypto.randomUUID();

export function createElement(type: BannerElementType, device: BannerDevice): BannerElement {
  const isMobile = device === 'mobile';
  const textScale = isMobile ? 2 : 1;
  const base = { id: newId(), x: 50, y: 50, rotation: 0 };

  switch (type) {
    case 'text':
      return {
        ...base, type, w: isMobile ? 80 : 40, text: 'Escribí tu texto', fontSize: 2.4 * textScale,
        weight: 400, color: DEFAULT_TEXT_COLOR, align: 'center', font: 'sans',
      };
    case 'button':
      return {
        ...base, type, w: isMobile ? 60 : 20, label: 'DESCUBRIR MÁS', href: '/products', fontSize: 1.4 * textScale,
        background: DEFAULT_TEXT_COLOR, color: '#ffffff',
      };
    case 'image':
      return { ...base, type, w: isMobile ? 60 : 24, h: isMobile ? 30 : 60, url: '', alt: '', framed: true, radius: 0, rotation: -4 };
    case 'line':
      return { ...base, type, w: isMobile ? 40 : 20, thickness: 0.2, color: DEFAULT_TEXT_COLOR };
  }
}

export function duplicateElement(element: BannerElement): BannerElement {
  return { ...element, id: newId(), x: Math.min(100, element.x + 3), y: Math.min(100, element.y + 3) };
}

// Punto de partida con la estructura de una campaña típica: el admin edita
// textos y colores en vez de arrancar de una hoja en blanco. Sin fotos: son
// opcionales y se agregan desde el panel.
export function createStarterDesign(device: BannerDevice): BannerDesign {
  const isMobile = device === 'mobile';
  const scale = isMobile ? 2 : 1;
  const textWidth = isMobile ? 88 : 60;

  const subtitle = {
    ...createElement('text', device), y: isMobile ? 30 : 24, w: textWidth, text: 'Subtítulo de tu campaña',
    fontSize: 2.6 * scale, font: 'serif' as const,
  };
  const title = {
    ...createElement('text', device), y: isMobile ? 42 : 40, w: textWidth, text: 'Título principal',
    fontSize: 6.5 * scale * (isMobile ? 0.8 : 1), weight: 800 as const, color: DEFAULT_ACCENT,
  };
  const details = {
    ...createElement('text', device), y: isMobile ? 58 : 60, w: isMobile ? 80 : 50,
    text: '3 CUOTAS sin interés\n10% OFF con transferencia', fontSize: 1.8 * scale, weight: 600 as const,
  };
  const button = { ...createElement('button', device), y: isMobile ? 76 : 82 };

  return {
    background: DEFAULT_BACKGROUND,
    gradientTo: null,
    backgroundImage: null,
    overlay: 0,
    elements: [subtitle, title, details, button],
  };
}
