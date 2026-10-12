import { useEffect, useState } from 'react';
import { cancelMpOrder } from '../../../../services/orderService';
import { forgetAbandonedMpPayment, peekAbandonedMpPayment } from '../mpDeadline';

/**
 * Si el usuario volvió de Mercado Pago con Atrás sin pagar, cancela su reserva anterior para
 * que no compita con el reintento (con 1 unidad, el nuevo intento daría 409 contra sí mismo).
 * El backend rechaza cancelar órdenes ya pagadas, así que un pago aprobado no se pierde.
 * @returns true si además el plazo de 15 minutos ya había vencido (para avisarlo).
 */
export const useReleaseAbandonedMpPayment = (): boolean => {
  const [abandoned] = useState(() => peekAbandonedMpPayment());

  useEffect(() => {
    if (!abandoned) return;
    forgetAbandonedMpPayment();
    abandoned.orderIds.forEach((orderId) => { void cancelMpOrder(orderId); });
  }, [abandoned]);

  return abandoned?.expired ?? false;
};
