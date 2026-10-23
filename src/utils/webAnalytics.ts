import { runWhenIdle } from './runWhenIdle';

const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';
// Margen para que la medición no compita con el render inicial.
const LOAD_DELAY_MS = 3000;

const CF_ANALYTICS_TOKEN: string | undefined = import.meta.env.VITE_CF_ANALYTICS_TOKEN;

/**
 * Cloudflare Web Analytics (Core Web Vitals reales de los visitantes, sin cookies).
 * Sin `VITE_CF_ANALYTICS_TOKEN` no hace nada. Se inyecta por código y no con un
 * `<script>` inline en index.html para respetar la CSP (sin 'unsafe-inline').
 * El panel admin no se mide: no representa la experiencia de los compradores.
 */
export function loadWebAnalytics(): void {
  if (!CF_ANALYTICS_TOKEN || window.location.pathname.startsWith('/admin')) return;

  runWhenIdle(() => {
    const script = document.createElement('script');
    script.defer = true;
    script.src = BEACON_SRC;
    script.dataset.cfBeacon = JSON.stringify({ token: CF_ANALYTICS_TOKEN });
    document.head.appendChild(script);
  }, LOAD_DELAY_MS);
}
