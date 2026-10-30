import { useEffect, useState } from 'react';
import { DEFAULT_SHIPPING_INFO, getShippingInfo, type ShippingInfo } from '../services/shippingInfoService';

/** Horario de retiro y plazos que publica el admin. Mientras carga (o si falla) rige el texto por defecto. */
export const useShippingInfo = (): ShippingInfo => {
  const [info, setInfo] = useState<ShippingInfo>(DEFAULT_SHIPPING_INFO);

  useEffect(() => {
    let cancelled = false;
    getShippingInfo()
      .then((loaded) => { if (!cancelled) setInfo(loaded); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  return info;
};
