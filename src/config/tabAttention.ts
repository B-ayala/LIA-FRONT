/**
 * Configuración centralizada del favicon/título dinámico de marketing
 * que se activa cuando el usuario deja de mirar la pestaña de LIA.
 * Para cambiar textos, íconos o comportamiento, editar solo este archivo.
 */
export const TAB_ATTENTION_CONFIG = {
  faviconDefault: '/favicons/favicon-lia.svg',
  faviconAway: '/favicons/favicon-lia-away.svg',
  awayMessages: [
    '¡Volvé! 💕 | LIA',
    '¡Te estamos esperando! 👀 | LIA',
    '¡No te vayas! 🛍️ | LIA',
    '¿Ya te vas? 😏 | LIA',
  ],
} as const;
