// Corre una tarea cuando el hilo principal queda libre, para que no compita
// con el render inicial de la página. Usa `requestIdleCallback` donde exista;
// donde no (Safari viejo), un `setTimeout` con el mismo delay como piso.
// Devuelve la función de limpieza: si el componente se desmonta antes de que
// el browser quede idle, la tarea no corre.
export function runWhenIdle(task: () => void, delayMs: number): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(task, { timeout: delayMs });
    return () => window.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(task, delayMs);
  return () => window.clearTimeout(timeoutId);
}
