import { getSiteContent } from './siteContentService';

/** Clave de `site_content` con el "Qué sigue" del mail de constancia del arrepentimiento. */
export const WITHDRAWAL_FOLLOWUP_KEY = 'withdrawal_followup';
export const FOLLOWUP_MAX_STEPS = 8;
export const FOLLOWUP_MAX_LENGTH = 300;

export interface WithdrawalFollowUp {
  /** Un paso por línea. */
  nextSteps: string;
  refundTerm: string;
}

// Mismo texto que usa el backend cuando no hay nada publicado (services/withdrawalNotifications.js).
export const DEFAULT_WITHDRAWAL_FOLLOWUP: WithdrawalFollowUp = {
  nextSteps: [
    'Dentro de las 24 horas nos ponemos en contacto para coordinar la devolución del producto.',
    'Te reintegramos lo que pagaste por el mismo medio de pago que usaste.',
  ].join('\n'),
  refundTerm: '',
};

export const normalizeWithdrawalFollowUp = (value: unknown): WithdrawalFollowUp => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const nextSteps = typeof source.nextSteps === 'string' ? source.nextSteps.trim() : '';
  const refundTerm = typeof source.refundTerm === 'string' ? source.refundTerm.trim() : '';
  return { nextSteps: nextSteps || DEFAULT_WITHDRAWAL_FOLLOWUP.nextSteps, refundTerm };
};

export const getWithdrawalFollowUp = async (): Promise<WithdrawalFollowUp> =>
  normalizeWithdrawalFollowUp(await getSiteContent<unknown>(WITHDRAWAL_FOLLOWUP_KEY));
