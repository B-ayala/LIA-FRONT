import { useCallback, useEffect, useRef, useState } from 'react';

export type CopyStatus = 'idle' | 'copied' | 'failed';

const FEEDBACK_MS = 2000;

/**
 * Copia texto al portapapeles y expone el resultado por unos segundos (para el "¡Copiado!").
 * `failed` cubre navegadores sin permiso de portapapeles: la UI debe dejar el texto a mano.
 */
export const useCopyToClipboard = () => {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    window.clearTimeout(timerRef.current);
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // Sin API o sin permiso (contexto inseguro, iframe, navegador viejo): se informa con `failed`.
      copied = false;
    }
    setStatus(copied ? 'copied' : 'failed');
    timerRef.current = window.setTimeout(() => setStatus('idle'), FEEDBACK_MS);
    return copied;
  }, []);

  return { status, copy };
};
