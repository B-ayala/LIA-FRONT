import { useEffect, useRef } from 'react';
import CheckoutNotice from './CheckoutNotice';
import type { TransferCreated } from '../hooks/useCheckoutPayment';

interface TransferCreatedPanelProps {
  created: TransferCreated;
  onDone: () => void;
}

/**
 * Pedido por transferencia ya creado: reemplaza al CTA para que un segundo click no cree otra
 * venta. Siempre ofrece "Abrir WhatsApp" (el navegador pudo bloquear la ventana automática).
 */
const TransferCreatedPanel = ({ created, onDone }: TransferCreatedPanelProps) => {
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div ref={headingRef} tabIndex={-1} className="checkout-step__created">
      <CheckoutNotice
        tone="success"
        role="alert"
        title="Pedido creado"
        actions={(
          <>
            <a
              href={created.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="checkout-notice__action"
            >
              Abrir WhatsApp
            </a>
            <button type="button" className="checkout-notice__action" onClick={onDone}>
              Volver a la tienda
            </button>
          </>
        )}
      >
        <p>
          {created.windowOpened
            ? 'Te abrimos WhatsApp con el resumen: mandanos ahí el comprobante de la transferencia.'
            : 'Tocá "Abrir WhatsApp" para mandarnos el resumen y el comprobante de la transferencia.'}
        </p>
      </CheckoutNotice>
    </div>
  );
};

export default TransferCreatedPanel;
