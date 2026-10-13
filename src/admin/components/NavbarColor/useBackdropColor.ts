import { useEffect, useState } from 'react';
import { sampleTopStripColor } from '../../../utils/sampleTopStrip';
import type { Rgb } from '../../../utils/navbarColor';

export type BackdropStatus = 'loading' | 'ready' | 'unavailable';

export interface Backdrop {
  rgb: Rgb | null;
  status: BackdropStatus;
}

interface Sampled {
  url: string;
  rgb: Rgb | null;
}

// Color de fondo contra el que se mide el contraste del menú. Con foto se
// promedia la franja superior (donde queda el menú); sin foto se usa el color
// conocido (`fallback`, ej. el fondo de un banner). El estado se deriva de la
// URL pedida: no hay setState síncrono dentro del efecto.
export function useBackdropColor(imageUrl: string | null, fallback: Rgb | null): Backdrop {
  const [sampled, setSampled] = useState<Sampled | null>(null);

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    void sampleTopStripColor(imageUrl).then((rgb) => {
      if (!cancelled) setSampled({ url: imageUrl, rgb });
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  if (!imageUrl) {
    return { rgb: fallback, status: fallback ? 'ready' : 'unavailable' };
  }
  if (sampled?.url !== imageUrl) {
    return { rgb: null, status: 'loading' };
  }
  return { rgb: sampled.rgb, status: sampled.rgb ? 'ready' : 'unavailable' };
}
