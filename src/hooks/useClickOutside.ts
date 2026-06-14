import { useEffect, type RefObject } from 'react';

export const useClickOutside = (
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  enabled = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback, enabled]);
};
