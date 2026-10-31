import { useId, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import './CopyField.css';

const ICON_SIZE = 16;
// La salida es un tween corto: con resorte el ícono viejo tarda en desvanecerse y el tilde,
// que espera a que termine (`mode="wait"`), llegaba tarde como confirmación.
const ICON_SWAP = {
  initial: { scale: 0.4, opacity: 0, rotate: -45 },
  animate: { scale: 1, opacity: 1, rotate: 0 },
  exit: { scale: 0.4, opacity: 0, transition: { duration: 0.08 } },
};
const ICON_SPRING = { type: 'spring', stiffness: 500, damping: 26 } as const;

interface CopyFieldProps {
  label: string;
  /** Lo que se ve (ej. "$128.700,00"). */
  display: string;
  /** Lo que se copia, si difiere de lo visible (ej. "128700" para pegar en el banco). */
  copyValue?: string;
}

/** Selecciona el valor para que se pueda copiar a mano cuando el portapapeles no está disponible. */
const selectContents = (node: HTMLElement | null) => {
  const selection = window.getSelection();
  if (!node || !selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
};

const BUTTON_TEXT = { idle: 'Copiar', copied: 'Copiado', failed: 'Copialo a mano' } as const;

/** Dato para la transferencia con botón de copiar: confirma con un tilde animado y lo anuncia. */
const CopyField = ({ label, display, copyValue }: CopyFieldProps) => {
  const { status, copy } = useCopyToClipboard();
  const valueRef = useRef<HTMLElement>(null);
  const labelId = useId();
  const reduceMotion = useReducedMotion();
  const copied = status === 'copied';

  const handleCopy = async () => {
    const ok = await copy(copyValue ?? display);
    if (!ok) selectContents(valueRef.current);
  };

  return (
    <div className={`copy-field${copied ? ' copy-field--copied' : ''}`}>
      <dt id={labelId} className="copy-field__label">{label}</dt>
      <dd className="copy-field__row">
        <strong ref={valueRef} className="copy-field__value">{display}</strong>
        <button
          type="button"
          className="copy-field__button"
          onClick={() => void handleCopy()}
          aria-describedby={labelId}
        >
          <span className="copy-field__icon" aria-hidden="true">
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={copied ? 'check' : 'copy'}
                className="copy-field__icon-inner"
                {...(reduceMotion ? {} : ICON_SWAP)}
                transition={ICON_SPRING}
              >
                {copied ? <Check size={ICON_SIZE} strokeWidth={3} /> : <Copy size={ICON_SIZE} />}
              </motion.span>
            </AnimatePresence>
          </span>
          {BUTTON_TEXT[status]}
        </button>
        <span className="sr-only" role="status">
          {copied ? `${label} copiado` : ''}
          {status === 'failed' ? `No pudimos copiar. Seleccionamos el ${label.toLowerCase()} para que lo copies a mano.` : ''}
        </span>
      </dd>
    </div>
  );
};

export default CopyField;
