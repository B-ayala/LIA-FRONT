import { useCallback, useState } from 'react';
import { CAPTCHA_ENABLED } from '../config/captcha';

export const CAPTCHA_REQUIRED_MESSAGE = 'Completá la verificación para continuar.';

/**
 * Estado del captcha de un formulario. `resetCaptcha` debe llamarse después de cada
 * intento: el token de Turnstile se puede usar una sola vez.
 */
export const useCaptcha = () => {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    setResetKey((key) => key + 1);
  }, []);

  return {
    captchaToken: captchaToken ?? undefined,
    isCaptchaMissing: CAPTCHA_ENABLED && !captchaToken,
    widgetProps: { onToken: setCaptchaToken, resetKey },
    resetCaptcha,
  };
};
