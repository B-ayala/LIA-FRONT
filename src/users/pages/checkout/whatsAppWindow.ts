/**
 * Safari iOS y Firefox bloquean `window.open` si no ocurre dentro del click: como la URL de
 * WhatsApp recién se conoce después de crear la orden (un `await`), la ventana se abre vacía
 * en el click y se le asigna la URL al terminar. Si el navegador la bloquea igual, devuelve
 * null y el checkout muestra el botón "Abrir WhatsApp".
 */
export const openPendingWindow = (): Window | null => {
  const popup = window.open('', '_blank');
  if (!popup) return null;
  // Sin `noopener` (devolvería null y no podríamos navegarla): se corta el vínculo a mano
  // para que la página abierta no pueda manipular esta pestaña (reverse tabnabbing).
  popup.opener = null;
  popup.document.title = 'Abriendo WhatsApp…';
  if (popup.document.body) popup.document.body.textContent = 'Preparando tu pedido…';
  return popup;
};

/** Lleva la ventana abierta en el click a `url`. false si no hay ventana o ya se cerró. */
export const navigatePendingWindow = (popup: Window | null, url: string): boolean => {
  if (!popup || popup.closed) return false;
  popup.location.href = url;
  return true;
};

export const closePendingWindow = (popup: Window | null): void => {
  if (popup && !popup.closed) popup.close();
};
