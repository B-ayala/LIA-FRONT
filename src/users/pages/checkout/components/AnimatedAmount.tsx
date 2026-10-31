import { useEffect, useRef } from 'react';
import { animate, motion, useAnimate, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { formatAmount } from '../checkoutUtils';
import './AnimatedAmount.css';

const COUNT_DURATION_S = 0.5;
const PULSE_DURATION_S = 0.4;
const DROP_HIGHLIGHT_MS = 900;
const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DROP_CLASS = 'animated-amount--drop';

interface AnimatedAmountProps {
  value: number;
  className?: string;
}

/**
 * Monto que se desliza hasta el valor nuevo (p. ej. al aplicar el descuento por transferencia).
 * Cuando baja, late una vez y se tiñe de verde un instante. Los lectores de pantalla leen solo
 * el valor final; con "reducir movimiento" el cambio es instantáneo.
 */
const AnimatedAmount = ({ value, className }: AnimatedAmountProps) => {
  const reduceMotion = useReducedMotion();
  const amount = useMotionValue(value);
  const text = useTransform(amount, (current) => `$${formatAmount(current)}`);
  const [scope, animateScope] = useAnimate<HTMLSpanElement>();
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return undefined;
    if (reduceMotion) {
      amount.set(value);
      return undefined;
    }

    const count = animate(amount, value, { duration: COUNT_DURATION_S, ease: EASE_OUT_EXPO });
    if (value >= from || !scope.current) return () => count.stop();

    // Se toca la clase directo en el nodo: el resaltado es puramente visual y no amerita un render.
    const node = scope.current;
    node.classList.add(DROP_CLASS);
    void animateScope(node, { scale: [1, 1.06, 1] }, { duration: PULSE_DURATION_S, ease: 'easeOut' });
    const timer = window.setTimeout(() => node.classList.remove(DROP_CLASS), DROP_HIGHLIGHT_MS);
    return () => {
      count.stop();
      window.clearTimeout(timer);
      node.classList.remove(DROP_CLASS);
    };
  }, [amount, animateScope, reduceMotion, scope, value]);

  return (
    <span ref={scope} className={`animated-amount${className ? ` ${className}` : ''}`}>
      <motion.span aria-hidden="true">{text}</motion.span>
      <span className="sr-only">${formatAmount(value)}</span>
    </span>
  );
};

export default AnimatedAmount;
