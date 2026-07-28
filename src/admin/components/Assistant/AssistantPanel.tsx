import { forwardRef, useEffect, useRef } from 'react';
import { Sparkles, X, Wifi } from 'lucide-react';
import QuickActions from './QuickActions';
import InsightCard from './InsightCard';
import type { Insight } from './assistant.types';

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

interface AssistantPanelProps {
  userName: string;
  status: RequestStatus;
  insight: Insight | null;
  error: string | null;
  activeId: string | null;
  favorites: string[];
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onNavigate: (to: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}

const LoadingState = () => (
  <div className="assistant-skeleton" role="status" aria-live="polite">
    <span className="sr-only">Cargando consulta…</span>
    <div className="assistant-skel-metrics">
      <span /><span /><span />
    </div>
    <div className="assistant-skel-rows">
      <span /><span /><span />
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="assistant-error" role="alert">
    <Wifi size={26} aria-hidden="true" />
    <p>{message}</p>
    <button type="button" className="assistant-action-btn" onClick={onRetry}>
      Reintentar
    </button>
  </div>
);

const IdleState = ({ userName }: { userName: string }) => (
  <div className="assistant-idle">
    <Sparkles size={30} aria-hidden="true" />
    <p className="assistant-idle-title">Hola{userName ? `, ${userName}` : ''} 👋</p>
    <p className="assistant-idle-sub">Tocá una consulta y te muestro el dato al instante.</p>
  </div>
);

const AssistantPanel = forwardRef<HTMLDivElement, AssistantPanelProps>((props, ref) => {
  const {
    userName, status, insight, error, activeId, favorites,
    onSelect, onToggleFavorite, onNavigate, onRefresh, onClose,
  } = props;

  // Al ejecutar una consulta, desliza el resultado a la vista (en el contenedor
  // scrolleable del panel) para que la respuesta quede visible sin scrollear a mano.
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (status === 'loading' || status === 'success' || status === 'error') {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status, insight]);

  return (
    <div
      className="assistant-panel"
      role="dialog"
      aria-label="Asistente del panel"
      aria-modal="false"
      ref={ref}
      tabIndex={-1}
    >
      <header className="assistant-header">
        <span className="assistant-header-icon" aria-hidden="true"><Sparkles size={18} /></span>
        <div className="assistant-header-text">
          <strong>Asistente</strong>
          <small>Consultas del negocio en segundos</small>
        </div>
        <button type="button" className="assistant-close" onClick={onClose} aria-label="Cerrar asistente">
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="assistant-body">
        <QuickActions
          favorites={favorites}
          activeId={activeId}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
        />

        <div className="assistant-result" ref={resultRef}>
          {status === 'idle' && <IdleState userName={userName} />}
          {status === 'loading' && <LoadingState />}
          {status === 'error' && (
            <ErrorState message={error ?? 'Algo salió mal.'} onRetry={onRefresh} />
          )}
          {status === 'success' && insight && (
            <InsightCard insight={insight} onNavigate={onNavigate} onRefresh={onRefresh} />
          )}
        </div>
      </div>
    </div>
  );
});

AssistantPanel.displayName = 'AssistantPanel';

export default AssistantPanel;
