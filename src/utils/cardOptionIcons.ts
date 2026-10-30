import {
  Wallet,
  CreditCard,
  Landmark,
  Truck,
  Percent,
  Store,
  BadgeCheck,
  ShieldCheck,
  PackageCheck,
  Tag,
  type LucideIcon,
} from 'lucide-react';

/** Íconos disponibles para las opciones de la card de producto (elegidos desde el Admin). */
export const CARD_OPTION_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  'credit-card': CreditCard,
  landmark: Landmark,
  truck: Truck,
  percent: Percent,
  store: Store,
  'badge-check': BadgeCheck,
  'shield-check': ShieldCheck,
  'package-check': PackageCheck,
  tag: Tag,
};

export const DEFAULT_CARD_OPTION_ICON = 'badge-check';

/** Valor persistido cuando la opción se muestra sin ícono (la DB y el backend exigen un texto no vacío). */
export const NO_ICON_KEY = 'none';

export const CARD_OPTION_ICON_KEYS = Object.keys(CARD_OPTION_ICONS);

/** `null` = la opción no lleva ícono. Una clave desconocida cae al ícono por defecto. */
export function getCardOptionIcon(icon: string): LucideIcon | null {
  if (icon === NO_ICON_KEY) return null;
  return CARD_OPTION_ICONS[icon] ?? CARD_OPTION_ICONS[DEFAULT_CARD_OPTION_ICON];
}
