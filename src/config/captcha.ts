export const TURNSTILE_SITE_KEY: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY;

/** Sin site key configurada el captcha queda apagado y los formularios funcionan igual. */
export const CAPTCHA_ENABLED = Boolean(TURNSTILE_SITE_KEY);
