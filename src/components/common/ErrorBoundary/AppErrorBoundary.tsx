import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isStaleChunkError, reloadOnceForNewVersion } from '../../../utils/reloadOnStaleChunk';
import './AppErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Último recurso ante un error de render: sin esto React desmonta todo el árbol y el
 * visitante queda frente a una pantalla en blanco. Va por fuera del router y de los
 * providers a propósito (usa un `<a>` común), así también cubre sus fallas.
 * El caso típico en producción es un chunk lazy que ya no existe tras un deploy:
 * recargar trae el index nuevo.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isStaleChunkError(error) && reloadOnceForNewVersion()) return;
    console.error('Error de render no controlado:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-error" role="alert">
        <h1 className="app-error__title">Algo salió mal</h1>
        <p className="app-error__text">
          No pudimos mostrar esta pantalla. Recargá la página y, si el problema sigue, volvé al inicio.
        </p>
        <div className="app-error__actions">
          <button type="button" className="app-error__button" onClick={() => window.location.reload()}>
            Recargar la página
          </button>
          <a className="app-error__link" href="/">
            Ir al inicio
          </a>
        </div>
      </main>
    );
  }
}
