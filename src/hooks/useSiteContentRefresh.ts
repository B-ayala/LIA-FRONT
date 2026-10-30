import { useEffect, useState } from 'react';
import { subscribeToSiteContent } from '../services/siteContentRealtime';
import { useRefetchOnVisible } from './useRefetchOnVisible';

// Devuelve un contador que sube cuando el admin cambia alguna de las filas de
// `site_content` indicadas (Realtime) o al volver a la pestaña (por si Realtime
// no está disponible). Se usa como dependencia del effect que lee el contenido:
// cada cambio de valor lo vuelve a correr, sin skeleton porque `isLoading` ya es false.
export function useSiteContentRefresh(keys: readonly string[]): number {
  const [tick, setTick] = useState(0);
  const keysId = keys.join('|');

  useEffect(() => {
    const bump = () => setTick((value) => value + 1);
    const unsubscribers = keysId.split('|').map((key) => subscribeToSiteContent(key, bump));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [keysId]);

  useRefetchOnVisible(() => setTick((value) => value + 1));

  return tick;
}
