export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  mp: 'Mercado Pago',
  transfer: 'Transferencia',
};

export const SHIPPING_METHOD_LABEL: Record<string, string> = {
  correo: 'Correo Argentino',
  local: 'Retiro en local',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'Pago en proceso',
  pagado: 'Pagado',
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
