import {
  PackageX, Flame, Store,
  type LucideIcon,
} from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  endpoint: string;
  icon: LucideIcon;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'pickups-to-confirm',
    label: 'Retiros a entregar',
    description: 'Retiro en local ya pagado, falta entregar',
    endpoint: 'pickups-to-confirm',
    icon: Store,
  },
  {
    id: 'low-stock',
    label: 'Stock bajo',
    description: 'Productos con menos de 5 unidades',
    endpoint: 'low-stock',
    icon: PackageX,
  },
  {
    id: 'top-products',
    label: 'Más vendidos',
    description: 'Top de productos del mes',
    endpoint: 'top-products',
    icon: Flame,
  },
];

export const getActionById = (id: string): QuickAction | undefined =>
  QUICK_ACTIONS.find((action) => action.id === id);

/** Acción que alimenta el indicador de alerta del launcher (badge rojo). */
export const ALERT_ACTION_ID = 'pickups-to-confirm';
