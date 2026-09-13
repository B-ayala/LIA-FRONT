import { supabase } from '../config/supabaseClient';

export interface BannerInfo {
  text: string;
  visible: boolean;
}

export interface WelcomeModalInfo {
  enabled: boolean;
  heading: string;
  lines: string[];
}

export const DEFAULT_WELCOME_MODAL: WelcomeModalInfo = {
  enabled: true,
  heading: '✨️ Calzados e Indumentaria ✨️',
  lines: [
    'Enviamos a todo el país 🇦🇷',
    'Por pedido (con seña) y stock',
    'Todos los medios de pago',
    'De lunes a sábado',
  ],
};

function normalizeSiteContentError(error: unknown, key: string, action: 'load' | 'save' | 'delete'): Error {
  if (error instanceof Error) {
    if (error.message.includes('no unique or exclusion constraint matching the ON CONFLICT specification')) {
      return new Error(`Falta la constraint UNIQUE en site_content.key para guardar ${key}.`);
    }

    if (error.message.toLowerCase().includes('row-level security')) {
      return new Error(`RLS está bloqueando la operación para ${key}. Verificá las policies de site_content.`);
    }

    return error;
  }

  return new Error(`No se pudo ${action === 'load' ? 'cargar' : action === 'save' ? 'guardar' : 'eliminar'} ${key}.`);
}

export async function getSiteContent<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('site_content')
    .select('value, updated_at')
    .eq('key', key)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw normalizeSiteContentError(error, key, 'load');
  }

  return (data?.value as T | undefined) ?? null;
}

export async function saveSiteContent<T>(key: string, value: T): Promise<void> {
  const { error } = await supabase
    .from('site_content')
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

  if (error) {
    throw normalizeSiteContentError(error, key, 'save');
  }
}

export async function deleteSiteContent(key: string): Promise<void> {
  const { error } = await supabase
    .from('site_content')
    .delete()
    .eq('key', key);

  if (error) {
    throw normalizeSiteContentError(error, key, 'delete');
  }
}

export function normalizeBannerInfo(value: unknown): BannerInfo | null {
  if (typeof value === 'string') {
    const text = value.trim();
    return text ? { text, visible: true } : null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const textCandidate = [raw.text, raw.message, raw.content, raw.title]
    .find((item) => typeof item === 'string' && item.trim().length > 0);

  if (typeof textCandidate !== 'string') {
    return null;
  }

  const visibleCandidate = raw.visible ?? raw.isVisible ?? raw.enabled ?? raw.active;
  const visible = typeof visibleCandidate === 'boolean'
    ? visibleCandidate
    : typeof visibleCandidate === 'string'
      ? visibleCandidate.toLowerCase() !== 'false'
      : true;

  return {
    text: textCandidate.trim(),
    visible,
  };
}

export function normalizeWelcomeModalInfo(value: unknown): WelcomeModalInfo | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;

  const heading = typeof raw.heading === 'string' ? raw.heading.trim() : '';
  const lines = Array.isArray(raw.lines)
    ? raw.lines.filter((line): line is string => typeof line === 'string' && line.trim().length > 0)
    : [];
  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : true;

  if (!heading && lines.length === 0) {
    return null;
  }

  return { enabled, heading, lines };
}