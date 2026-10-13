import type { CarouselLayout } from '../services/productService';
import type { BannerDesign } from './carouselBanner';

export type CarouselItemKind = 'image' | 'banner';

export type CarouselItem =
  | { kind: 'image'; url: string }
  | { kind: 'banner'; design: BannerDesign };

const IMAGES_PER_SLIDE = { single: 1, collageMobile: 2, collageDesktop: 3 } as const;

export function imagesPerSlide(layout: CarouselLayout, isMobile: boolean): number {
  if (layout === 'single') return IMAGES_PER_SLIDE.single;
  return isMobile ? IMAGES_PER_SLIDE.collageMobile : IMAGES_PER_SLIDE.collageDesktop;
}

// Un banner es siempre un slide completo (su composición ya ocupa toda la
// pantalla); las imágenes consecutivas se agrupan de a `perSlide` según el
// layout. Lo usan el carrusel público y el admin, para que ambos numeren
// igual los slides.
export function groupBySlide<T extends { kind: CarouselItemKind }>(items: T[], perSlide: number): T[][] {
  const groups: T[][] = [];
  let run: T[] = [];

  const flushRun = () => {
    for (let i = 0; i < run.length; i += perSlide) {
      groups.push(run.slice(i, i + perSlide));
    }
    run = [];
  };

  for (const item of items) {
    if (item.kind === 'banner') {
      flushRun();
      groups.push([item]);
    } else {
      run.push(item);
    }
  }
  flushRun();

  return groups;
}
