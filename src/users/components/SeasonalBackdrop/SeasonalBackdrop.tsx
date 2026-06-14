import { useEffect, useState } from 'react';
import { useSeasonTheme } from '../../../utils/SeasonThemeProvider';
import type { SeasonId } from '../../../utils/seasonThemes';
import './SeasonalBackdrop.css';

// Glyphs por estación — emojis para no depender de assets externos.
// Se renderizan con pointer-events: none y aria-hidden para que no afecten
// ni la accesibilidad ni los clicks del usuario.
// El tema 'default' no tiene partículas (hasParticles: false).
const PARTICLES: Partial<Record<SeasonId, string[]>> = {
  autumn: ['🍂', '🍁', '🍂', '🍁', '🍃'],
  winter: ['❄', '❅', '❆', '❄', '✦'],
  spring: ['🌸', '🌷', '🌼', '🌸', '🍃'],
  summer: ['✦', '☀', '✧', '✦', '·'],
};

const PARTICLE_COUNT = 12;

// Ventana para montar el backdrop después de que el browser termine el primer
// paint y el LCP — la animación no aporta nada visible hasta ~1s después del
// load y sí le roba ciclos al hilo principal si se monta antes.
const MOUNT_DELAY_MS = 800;

const SeasonalBackdrop = () => {
  const { season, isAnimationEnabled } = useSeasonTheme();
  const glyphs = PARTICLES[season];
  const [mounted, setMounted] = useState(false);

  // Postergamos el montaje del backdrop para no competir con el render inicial
  // de la página. requestIdleCallback donde exista; setTimeout como fallback.
  useEffect(() => {
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }).requestIdleCallback;

    if (ric) {
      const id = ric(() => setMounted(true), { timeout: MOUNT_DELAY_MS + 500 });
      return () => {
        const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        if (cic) cic(id);
      };
    }

    const timeoutId = window.setTimeout(() => setMounted(true), MOUNT_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Pausa las animaciones cuando el tab no está visible — el browser throttlea
  // automáticamente, pero con `animation-play-state: paused` (vía atributo en
  // <html>) liberamos también el trabajo de compositor.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const syncHidden = () => {
      document.documentElement.dataset.pageHidden = document.hidden ? 'true' : 'false';
    };
    syncHidden();
    document.addEventListener('visibilitychange', syncHidden);
    return () => document.removeEventListener('visibilitychange', syncHidden);
  }, []);

  // Sin partículas configuradas (p.ej. 'default') o toggle desactivado para
  // esta estación → no renderizamos nada.
  if (!glyphs || !isAnimationEnabled(season) || !mounted) return null;

  return (
    <div className="seasonal-backdrop" aria-hidden="true">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <span key={i} className="seasonal-particle">
          {glyphs[i % glyphs.length]}
        </span>
      ))}
    </div>
  );
};

export default SeasonalBackdrop;
