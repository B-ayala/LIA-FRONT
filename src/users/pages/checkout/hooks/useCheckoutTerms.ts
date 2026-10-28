import { useCallback, useEffect, useState } from 'react';
import {
  acceptTerms,
  getTermsStatus,
  TermsVersionOutdatedError,
  type TermsStatus,
} from '../../../../services/termsService';

const VERIFYING_MESSAGE = 'Estamos verificando los términos y condiciones…';
const TERMS_REQUIRED_MESSAGE = 'Aceptá los términos y condiciones para continuar.';
const STATUS_ERROR_MESSAGE = 'No pudimos verificar los términos y condiciones. Recargá la página e intentá de nuevo.';
const OUTDATED_MESSAGE = 'Los términos y condiciones cambiaron. Revisalos y aceptá la nueva versión para continuar.';

type StatusState = { phase: 'loading' } | { phase: 'error' } | { phase: 'ready'; status: TermsStatus };

export interface CheckoutTerms {
  /** Versión vigente; null mientras se verifica. */
  version: string | null;
  /** La cuenta ya aceptó la versión vigente: alcanza con avisar, no hace falta el tilde. */
  alreadyAccepted: boolean;
  /** Hay que mostrar el tilde (cuenta sin aceptar la versión vigente). */
  needsCheckbox: boolean;
  checked: boolean;
  setChecked: (checked: boolean) => void;
  /** Motivo por el que todavía no se puede pagar; null si los términos no frenan el pago. */
  lockReason: string | null;
  /** Deja constancia de la aceptación si hace falta. Lanza un Error con mensaje humano si no se pudo. */
  ensureAccepted: () => Promise<void>;
}

/**
 * Estado de los Términos en el checkout. La versión vigente la decide el backend. Si la cuenta ya aceptó
 * esa versión (al registrarse o antes), el pago solo muestra un aviso; si no, pide el tilde una vez y
 * lo registra antes de crear el pedido.
 */
export const useCheckoutTerms = (): CheckoutTerms => {
  const [state, setState] = useState<StatusState>({ phase: 'loading' });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTermsStatus()
      .then((status) => { if (!cancelled) setState({ phase: 'ready', status }); })
      .catch(() => { if (!cancelled) setState({ phase: 'error' }); });
    return () => { cancelled = true; };
  }, []);

  const ready = state.phase === 'ready' ? state.status : null;
  const alreadyAccepted = ready?.accepted === true;
  const needsCheckbox = ready !== null && !ready.accepted;

  const ensureAccepted = useCallback(async () => {
    if (!ready) throw new Error(STATUS_ERROR_MESSAGE);
    if (ready.accepted) return;
    try {
      await acceptTerms(ready.currentVersion);
      setState({ phase: 'ready', status: { currentVersion: ready.currentVersion, accepted: true } });
    } catch (error) {
      if (error instanceof TermsVersionOutdatedError) {
        setState({ phase: 'ready', status: { currentVersion: error.currentVersion, accepted: false } });
        setChecked(false);
        throw new Error(OUTDATED_MESSAGE);
      }
      throw error;
    }
  }, [ready]);

  const lockReason = (() => {
    if (state.phase === 'loading') return VERIFYING_MESSAGE;
    if (state.phase === 'error') return STATUS_ERROR_MESSAGE;
    return needsCheckbox && !checked ? TERMS_REQUIRED_MESSAGE : null;
  })();

  return {
    version: ready?.currentVersion ?? null,
    alreadyAccepted,
    needsCheckbox,
    checked,
    setChecked,
    lockReason,
    ensureAccepted,
  };
};
