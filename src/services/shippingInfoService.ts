import { getSiteContent } from './siteContentService';

/** Clave de `site_content` donde el admin publica horario de retiro y plazos de Correo. */
export const SHIPPING_INFO_KEY = 'shipping_info';
export const SHIPPING_INFO_MAX_LENGTH = 200;

export interface ShippingInfo {
  pickupHours: string;
  correoDispatch: string;
  correoDelivery: string;
  /** Cómo se entrega, en una frase corta para las descripciones de Google ("con <frase>"). */
  shippingSummary: string;
  /** Párrafo de la página Contacto sobre la entrega. */
  contactNote: string;
}

export const DEFAULT_SHIPPING_INFO: ShippingInfo = {
  pickupHours: 'lunes a viernes de 10 a 19 hs',
  correoDispatch: 'Despacho lun, mié y vie. Preparación: 24 hs.',
  correoDelivery: 'Llega en 3 a 5 días hábiles desde el despacho.',
  shippingSummary: 'retiro en nuestro local',
  contactNote: 'Por ahora la entrega es con retiro en nuestro local. Coordinamos por WhatsApp.',
};

const readField = (source: Record<string, unknown>, field: keyof ShippingInfo): string => {
  const value = source[field];
  const text = typeof value === 'string' ? value.trim().slice(0, SHIPPING_INFO_MAX_LENGTH) : '';
  return text || DEFAULT_SHIPPING_INFO[field];
};

/** Cada campo vacío o inválido cae a su valor por defecto: nunca queda una pantalla sin dato. */
export const normalizeShippingInfo = (value: unknown): ShippingInfo => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    pickupHours: readField(source, 'pickupHours'),
    correoDispatch: readField(source, 'correoDispatch'),
    correoDelivery: readField(source, 'correoDelivery'),
    shippingSummary: readField(source, 'shippingSummary'),
    contactNote: readField(source, 'contactNote'),
  };
};

export const getShippingInfo = async (): Promise<ShippingInfo> =>
  normalizeShippingInfo(await getSiteContent<unknown>(SHIPPING_INFO_KEY));
