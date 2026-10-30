import { useEffect, useState } from 'react';
import { DEFAULT_SHIPPING_INFO, SHIPPING_INFO_KEY, getShippingInfo, type ShippingInfo } from '../services/shippingInfoService';
import { useSiteContentRefresh } from './useSiteContentRefresh';

const SHIPPING_KEYS = [SHIPPING_INFO_KEY] as const;

/** Horario de retiro y plazos que publica el admin. Mientras carga (o si falla) rige el texto por defecto. */
export const useShippingInfo = (): ShippingInfo => {
  const [info, setInfo] = useState<ShippingInfo>(DEFAULT_SHIPPING_INFO);
  const refreshTick = useSiteContentRefresh(SHIPPING_KEYS);

  useEffect(() => {
    let cancelled = false;
    getShippingInfo()
      .then((loaded) => { if (!cancelled) setInfo(loaded); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [refreshTick]);

  return info;
};
