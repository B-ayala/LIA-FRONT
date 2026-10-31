import type { CheckoutItem, UnitVariants } from '../../../store/cartStore';
import { INVALID_PRODUCT_PRICE_MESSAGE, type OrderLineItemPayload } from '../../../services/orderService';
import { buildVariantLine, allUnitsShareVariants } from '../../../utils/formatters';
import { getTransferUnitPrice, roundToCents } from '../../../utils/pricing';

export type ShippingMethod = 'correo' | 'local';
export type PaymentMethod = 'mp' | 'transfer';

export const SHIPPING_COSTS: Record<ShippingMethod, number> = {
  correo: 4400,
  local: 0,
};

export const SHIPPING_LABEL: Record<ShippingMethod, string> = {
  correo: 'Correo Argentino',
  local: 'Retiro en local',
};

export interface CheckoutReturnState {
  shipping?: ShippingMethod;
}

/** Envío recibido por `location.state` al volver de Mercado Pago; ignora valores desconocidos. */
export const parseReturnShipping = (state: unknown): ShippingMethod | null => {
  const shipping = (state as CheckoutReturnState | null)?.shipping;
  return shipping === 'local' || shipping === 'correo' ? shipping : null;
};

export const DEFAULT_SHIPPING: ShippingMethod = 'local';
export const DEFAULT_PAYMENT: PaymentMethod = 'mp';
export const WHATSAPP_PHONE = '5491141442409';
export const TRANSFER_ALIAS = 'Liazapatos';

export const formatAmount = (n: number): string =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Monto para pegar en la app del banco: sin "$" ni separador de miles, y con coma decimal solo
 * si hay centavos ("128700" / "128700,50"). Los homebanking rechazan "$128.700,00".
 */
export const formatAmountForBank = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');

export interface CheckoutTotals {
  /** Suma de las líneas a precio de lista. */
  itemsSubtotal: number;
  /** Cuánto se ahorra pagando por transferencia (se calcula siempre, para ofrecerlo en la opción). */
  transferSavings: number;
  /** Descuento aplicado al total con el medio elegido: el ahorro si es transferencia, si no 0. */
  paymentDiscount: number;
  shippingCost: number;
  grandTotal: number;
  hasValidPrice: boolean;
}

const isPositiveAmount = (n: number): boolean => Number.isFinite(n) && n > 0;

const safeAmount = (n: number): number => (Number.isFinite(n) ? n : 0);

/** Total de la línea con transferencia (mismo cálculo que hace el backend al reservar). */
const transferLineTotal = (item: CheckoutItem): number =>
  roundToCents(getTransferUnitPrice(item.unitPrice, item.product.transferPrice) * item.quantity);

export const computeCheckoutTotals = (
  items: CheckoutItem[],
  shipping: ShippingMethod,
  payment: PaymentMethod
): CheckoutTotals => {
  const itemsSubtotal = roundToCents(items.reduce((sum, item) => sum + safeAmount(item.totalPrice), 0));
  const transferSubtotal = roundToCents(items.reduce((sum, item) => sum + safeAmount(transferLineTotal(item)), 0));
  const transferSavings = Math.max(0, roundToCents(itemsSubtotal - transferSubtotal));
  const paymentDiscount = payment === 'transfer' ? transferSavings : 0;
  const shippingCost = SHIPPING_COSTS[shipping];
  const hasValidPrice =
    items.length > 0 &&
    items.every((item) => isPositiveAmount(item.unitPrice) && isPositiveAmount(item.totalPrice));

  return {
    itemsSubtotal,
    transferSavings,
    paymentDiscount,
    shippingCost,
    grandTotal: roundToCents(itemsSubtotal - paymentDiscount + shippingCost),
    hasValidPrice,
  };
};

export const buildOrderItemsPayload = (items: CheckoutItem[]): OrderLineItemPayload[] =>
  items.map((item) => ({
    productId: String(item.product.id),
    productName: item.product.name,
    productImage: item.product.image,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    unitsConfig: item.unitVariants,
  }));

const joinVariantLine = (uv: UnitVariants): string =>
  Object.entries(uv)
    .map(([name, val]) => buildVariantLine(name, val))
    .join(' | ');

const buildItemLines = (item: CheckoutItem, index: number): string[] => {
  const allSame = allUnitsShareVariants(item.unitVariants);
  const lines = [`*Producto ${index + 1}:* ${item.product.name}`, `*Cantidad:* ${item.quantity}`, ''];

  if (allSame && Object.keys(item.unitVariants[0] ?? {}).length > 0) {
    lines.push(`*Variantes:* ${joinVariantLine(item.unitVariants[0])}`);
  } else if (!allSame) {
    item.unitVariants.forEach((uv, unitIndex) => {
      lines.push(`* Unidad ${unitIndex + 1}: ${joinVariantLine(uv)}`);
    });
  }

  lines.push('', `*Subtotal producto:* $${formatAmount(item.totalPrice)}`, '');
  return lines;
};

export const buildWhatsAppMessage = (
  items: CheckoutItem[],
  shipping: ShippingMethod,
  totals: CheckoutTotals
): string => {
  const shippingLine =
    totals.shippingCost === 0
      ? `* Envío: Gratis (Retiro en local)`
      : `* Envío: $${formatAmount(totals.shippingCost)} (Correo Argentino)`;

  const lines = [
    'Hola, ¿cómo estás?',
    'Quiero comprar los siguientes productos:',
    '',
    ...items.flatMap(buildItemLines),
    `*Resumen:*`,
    '',
    `* Subtotal: $${formatAmount(totals.itemsSubtotal)}`,
    ...(totals.paymentDiscount > 0 ? [`* Descuento por transferencia: -$${formatAmount(totals.paymentDiscount)}`] : []),
    shippingLine,
    `* Total: $${formatAmount(totals.grandTotal)}`,
    '',
    `*Método de entrega:* ${SHIPPING_LABEL[shipping]}`,
    '',
    'Adjunto comprobante de pago.',
  ];

  return lines.join('\n');
};

export const buildWhatsAppUrl = (message: string): string =>
  `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;

export const MISSING_NAME_MESSAGE = 'Completá tu nombre y apellido para continuar.';
export const MISSING_EMAIL_MESSAGE = 'Tu cuenta no tiene un e-mail asociado. Cerrá sesión y volvé a ingresar.';

/** Motivo visible por el que no se puede avanzar al pago, o null si está todo en orden. */
export const getCheckoutBlockReason = (
  totals: CheckoutTotals,
  buyerName: string,
  buyerEmail: string
): string | null => {
  if (!totals.hasValidPrice) return INVALID_PRODUCT_PRICE_MESSAGE;
  if (buyerEmail.trim() === '') return MISSING_EMAIL_MESSAGE;
  if (buyerName.trim() === '') return MISSING_NAME_MESSAGE;
  return null;
};
