import {
  PackageX, DollarSign, CreditCard, Clock, Flame, TrendingUp, Store,
  type LucideIcon,
} from 'lucide-react';

/**
 * Registro de acciones rápidas del asistente. Fuente única: para sumar una nueva
 * consulta basta con agregar una entrada acá + su endpoint en el backend. El resto
 * de la UI (botones, historial, render del resultado) es genérico y no se toca.
 */
export interface QuickAction {
  id: string;
  label: string;
  description: string;
  endpoint: string;
  icon: LucideIcon;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'low-stock',
    label: 'Stock bajo',
    description: 'Productos con menos de 5 unidades',
    endpoint: 'low-stock',
    icon: PackageX,
  },
  {
    id: 'sales-today',
    label: 'Ventas de hoy',
    description: 'Facturación y pedidos del día',
    endpoint: 'sales-today',
    icon: DollarSign,
  },
  {
    id: 'pending-payment',
    label: 'Pagos pendientes (todos)',
    description: 'Todos los pedidos sin pagar, por cualquier medio',
    endpoint: 'pending-payment',
    icon: CreditCard,
  },
  {
    id: 'pending-pickups',
    label: 'Retiros impagos',
    description: 'Solo retiro en local por WhatsApp, sin pagar aún',
    endpoint: 'pending-pickups',
    icon: Clock,
  },
  {
    id: 'top-products',
    label: 'Más vendidos',
    description: 'Top de productos del mes',
    endpoint: 'top-products',
    icon: Flame,
  },
  {
    id: 'sales-growth',
    label: 'Mayor crecimiento',
    description: 'Productos que más subieron vs. mes anterior',
    endpoint: 'sales-growth',
    icon: TrendingUp,
  },
  {
    id: 'pickups-to-confirm',
    label: 'Retiros a entregar',
    description: 'Retiro en local ya pagado, falta entregar',
    endpoint: 'pickups-to-confirm',
    icon: Store,
  },
];

export const getActionById = (id: string): QuickAction | undefined =>
  QUICK_ACTIONS.find((action) => action.id === id);

/** Acción que alimenta el indicador de alerta del launcher (badge rojo). */
export const ALERT_ACTION_ID = 'pending-pickups';
