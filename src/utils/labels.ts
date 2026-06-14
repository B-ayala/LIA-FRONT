export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  mp: 'Mercado Pago',
  transfer: 'Transferencia',
};

export const SHIPPING_METHOD_LABEL: Record<string, string> = {
  correo: 'Correo Argentino',
  moto: 'Envío por moto',
  local: 'Retiro en local',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  fallido: 'Fallido',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
};

export const DISPATCH_STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  despachado: 'Despachado',
  listo_para_retiro: 'Listo para retiro',
  entregado: 'Entregado',
};

export const filterSelectSlotProps = {
  select: {
    displayEmpty: true,
  },
} as const;
