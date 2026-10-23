import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../config/supabaseClient';
import { runWhenIdle } from '../utils/runWhenIdle';

/**
 * Un único canal de Realtime para todos los cambios de `site_content`.
 *
 * Antes cada consumidor (banner, navbar, tema, tipografía) abría su propio canal:
 * 4 suscripciones por visitante sobre la misma tabla. Ahora se comparten: el canal
 * se abre cuando aparece el primer oyente (con el hilo principal libre, para no
 * competir con el render inicial) y se cierra cuando se va el último.
 */

type Listener = () => void;

// Mismo plazo que usaba el navbar: la actualización en vivo no es crítica.
const SUBSCRIBE_DELAY_MS = 2500;

const listenersByKey = new Map<string, Set<Listener>>();
let channel: RealtimeChannel | null = null;
let cancelPendingSubscribe: (() => void) | null = null;

const notify = (key: unknown): void => {
  if (typeof key !== 'string') return;
  listenersByKey.get(key)?.forEach((listener) => listener());
};

const openChannel = (): void => {
  cancelPendingSubscribe = runWhenIdle(() => {
    cancelPendingSubscribe = null;
    if (listenersByKey.size === 0) return;
    channel = supabase
      .channel('public:site_content')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_content' }, (payload) => {
        const row = (payload.new ?? payload.old) as { key?: string } | undefined;
        notify(row?.key);
      })
      .subscribe();
  }, SUBSCRIBE_DELAY_MS);
};

const closeChannel = (): void => {
  cancelPendingSubscribe?.();
  cancelPendingSubscribe = null;
  if (channel) void supabase.removeChannel(channel);
  channel = null;
};

/** Avisa cuando cambia la fila `key` de `site_content`. Devuelve la función para dejar de escuchar. */
export function subscribeToSiteContent(key: string, listener: Listener): () => void {
  const wasEmpty = listenersByKey.size === 0;
  const listeners = listenersByKey.get(key) ?? new Set<Listener>();
  listeners.add(listener);
  listenersByKey.set(key, listeners);
  if (wasEmpty) openChannel();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) listenersByKey.delete(key);
    if (listenersByKey.size === 0) closeChannel();
  };
}
