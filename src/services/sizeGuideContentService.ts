import { getSiteContent } from './siteContentService';
import { normalizeSizeGuideContent } from '../utils/sizeGuideContent';
import type { SizeGuideContent } from '../types/sizeGuideContent';

/** Clave de `site_content` con los textos globales de la guía de talles. */
export const SIZE_GUIDE_CONTENT_KEY = 'size_guide_content';

export const getSizeGuideContent = async (): Promise<SizeGuideContent> =>
  normalizeSizeGuideContent(await getSiteContent<unknown>(SIZE_GUIDE_CONTENT_KEY));
