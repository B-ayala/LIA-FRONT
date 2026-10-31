import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import CheckoutNotice from './CheckoutNotice';
import CopyField from './CopyField';
import type { TransferCreated } from '../hooks/useCheckoutPayment';
import { TRANSFER_ALIAS, formatAmount, formatAmountForBank } from '../checkoutUtils';

interface TransferCreatedPanelProps {
  created: TransferCreated;
  onDone: () => void;
}

const ENTER = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };
const ENTER_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

/**
 * Pedido por transferencia ya creado: reemplaza al CTA para que un segundo click no cree otra
 * venta. Deja a mano alias y monto para copiarlos en el banco, y siempre ofrece "Abrir WhatsApp"
 * (el navegador pudo bloquear la ventana automática).
 */
const TransferCreatedPanel = ({ created, onDone }: TransferCreatedPanelProps) => {
  const headingRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <motion.div
      ref={headingRef}
      tabIndex={-1}
      className="checkout-step__created"
      {...(reduceMotion ? {} : ENTER)}
      transition={ENTER_TRANSITION}
    >
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
        <p>Transferí el monto exacto a este alias desde tu banco o billetera virtual:</p>
        <dl className="checkout-step__transfer-data">
          <CopyField label="Alias" display={TRANSFER_ALIAS} />
          <CopyField
            label="Monto a transferir"
            display={`$${formatAmount(created.amount)}`}
            copyValue={formatAmountForBank(created.amount)}
          />
        </dl>
        <p>
          {created.windowOpened
            ? 'Te abrimos WhatsApp con el resumen: mandanos ahí el comprobante de la transferencia.'
            : 'Después tocá "Abrir WhatsApp" para mandarnos el resumen y el comprobante de la transferencia.'}
        </p>
      </CheckoutNotice>
    </motion.div>
  );
};

export default TransferCreatedPanel;
