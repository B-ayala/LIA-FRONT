import { useMemo } from 'react';
import type { BannerDesign } from '../../../utils/carouselBanner';
import { averageRgb, hexToRgb, type Rgb } from '../../../utils/navbarColor';
import { useBackdropColor, type Backdrop } from './useBackdropColor';

const darken = (rgb: Rgb, amount: number): Rgb => ({
  r: Math.round(rgb.r * (1 - amount)),
  g: Math.round(rgb.g * (1 - amount)),
  b: Math.round(rgb.b * (1 - amount)),
});

const solidBackgroundRgb = (design: BannerDesign): Rgb | null => {
  const colors = [design.background, design.gradientTo]
    .flatMap((hex) => (hex ? [hexToRgb(hex)] : []))
    .flatMap((rgb) => (rgb ? [rgb] : []));
  return colors.length > 0 ? averageRgb(colors) : null;
};

// Contra qué color se mide el menú sobre un banner: la foto de fondo (con su
// oscurecido) si hay, o el color/degradé de fondo.
export function useBannerBackdrop(design: BannerDesign): Backdrop {
  const solid = useMemo(() => solidBackgroundRgb(design), [design]);
  const backdrop = useBackdropColor(design.backgroundImage, solid);
  if (!design.backgroundImage || !backdrop.rgb) return backdrop;
  return { ...backdrop, rgb: darken(backdrop.rgb, design.overlay) };
}
