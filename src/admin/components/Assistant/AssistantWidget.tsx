import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { fetchInsight } from '../../../services/insightsService';
import { ALERT_ACTION_ID, getActionById } from './assistantConfig';
import AssistantPanel, { type RequestStatus } from './AssistantPanel';
import type { Insight } from './assistant.types';
import './Assistant.css';

const FAVORITES_KEY = 'assistant:favorites';

const readStored = (key: string): string[] => {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const persist = (key: string, value: string[]): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage lleno o bloqueado: la feature sigue funcionando sin persistir */
  }
};

const AssistantWidget = () => {
  const navigate = useNavigate();
  const userName = useAuthStore((state) => state.currentUser?.name ?? '');

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [insight, setInsight] = useState<Insight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);

  const [favorites, setFavorites] = useState<string[]>(() => readStored(FAVORITES_KEY));

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => persist(FAVORITES_KEY, favorites), [favorites]);

  const runAction = useCallback((id: string) => {
    const action = getActionById(id);
    if (!action) return;
    setActiveId(id);
    setStatus('loading');
    setError(null);

    fetchInsight(action.endpoint)
      .then((result) => {
        setInsight(result);
        setStatus('success');
        if (id === ALERT_ACTION_ID) setAlertCount(result.table?.rows.length ?? 0);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No pudimos completar la consulta.');
        setStatus('error');
      });
  }, []);

  // Indicador de alerta del launcher: cuántos retiros por WhatsApp llevan +15 min.
  // Una sola consulta al montar; si falla (sesión/red), se ignora en silencio.
  useEffect(() => {
    let active = true;
    fetchInsight(getActionById(ALERT_ACTION_ID)!.endpoint)
      .then((result) => { if (active) setAlertCount(result.table?.rows.length ?? 0); })
      .catch(() => { /* sin alerta si no se pudo consultar */ });
    return () => { active = false; };
  }, []);

  const handleRefresh = useCallback(() => {
    if (activeId) runAction(activeId);
  }, [activeId, runAction]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleNavigate = useCallback((to: string) => {
    setOpen(false);
    navigate(to);
  }, [navigate]);

  // Cerrar con Escape o click fuera del widget.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className="assistant-widget" ref={containerRef}>
      {open && (
        <AssistantPanel
          ref={panelRef}
          userName={userName}
          status={status}
          insight={insight}
          error={error}
          activeId={activeId}
          favorites={favorites}
          onSelect={runAction}
          onToggleFavorite={toggleFavorite}
          onNavigate={handleNavigate}
          onRefresh={handleRefresh}
          onClose={() => setOpen(false)}
        />
      )}

      <button
        type="button"
        className={`assistant-launcher ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
        aria-expanded={open}
      >
        <Sparkles size={22} aria-hidden="true" />
        {!open && alertCount > 0 && (
          <span className="assistant-launcher-badge" aria-label={`${alertCount} alertas`}>
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default AssistantWidget;
