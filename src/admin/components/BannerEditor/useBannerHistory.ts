import { useCallback, useReducer } from 'react';
import type { BannerDesign } from '../../../utils/carouselBanner';

const MAX_HISTORY = 60;
// Cambios seguidos de un mismo control (arrastrar, deslizar, tipear) cuentan
// como un único paso de "deshacer".
const COALESCE_WINDOW_MS = 800;

interface HistoryState {
  past: BannerDesign[];
  present: BannerDesign;
  future: BannerDesign[];
  lastKey: string | null;
  lastAt: number;
}

type HistoryAction =
  | { type: 'update'; apply: (design: BannerDesign) => BannerDesign; key: string | null; at: number }
  | { type: 'undo' }
  | { type: 'redo' };

function reducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'update': {
      const coalesce = action.key !== null
        && action.key === state.lastKey
        && action.at - state.lastAt < COALESCE_WINDOW_MS;
      return {
        past: coalesce ? state.past : [...state.past, state.present].slice(-MAX_HISTORY),
        present: action.apply(state.present),
        future: [],
        lastKey: action.key,
        lastAt: action.at,
      };
    }
    case 'undo': {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        lastKey: null,
        lastAt: 0,
      };
    }
    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return { past: [...state.past, state.present], present: next, future: rest, lastKey: null, lastAt: 0 };
    }
  }
}

export function useBannerHistory(initial: BannerDesign) {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: initial,
    future: [],
    lastKey: null,
    lastAt: 0,
  });

  // Recibe una función (no el diseño ya armado) para que dos cambios seguidos
  // nunca pisen al otro con un estado viejo.
  const update = useCallback((apply: (design: BannerDesign) => BannerDesign, key: string | null = null) => {
    dispatch({ type: 'update', apply, key, at: Date.now() });
  }, []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  return {
    design: state.present,
    update,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
