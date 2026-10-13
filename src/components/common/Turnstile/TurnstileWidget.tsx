import { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY as SITE_KEY } from '../../../config/captcha';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

const loadTurnstile = (): Promise<TurnstileApi> => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile no disponible')));
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('No se pudo cargar la verificación'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
};

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
  /** Cambiar este valor destruye y vuelve a crear el widget (el token es de un solo uso). */
  resetKey?: number;
}

const TurnstileWidget = ({ onToken, resetKey = 0 }: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const siteKey = SITE_KEY;
    if (!siteKey || !container) return undefined;

    let widgetId: string | null = null;
    let cancelled = false;
    onToken(null);

    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widgetId = api.render(container, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        });
      })
      .catch(() => onToken(null));

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      onToken(null);
    };
  }, [resetKey, onToken]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} style={{ minHeight: 65 }} data-testid="turnstile-widget" />;
};

export default TurnstileWidget;
