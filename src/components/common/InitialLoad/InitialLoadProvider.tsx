import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import InitialLoadingScreen from './InitialLoadingScreen';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

type InitialLoadContextValue = {
  isInitialLoading: boolean;
  isTracking: boolean;
  startTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
};

// Nota de performance: estas tareas gatean únicamente la pantalla de shell
// (splash) inicial, nunca datos remotos — cada tarea debe resolverse con
// trabajo local/sincrónico. Bloquear el splash en un fetch (auth, categorías,
// productos, etc.) retrasa el primer contenido sin necesidad: cada sección ya
// tiene su propio loading/empty/error granular.
const REQUIRED_INITIAL_TASKS = ['auth', 'route', 'public-layout'] as const;
const MIN_SCREEN_TIME_MS = 450;

const InitialLoadContext = createContext<InitialLoadContextValue | null>(null);

export const InitialLoadProvider = ({ children }: PropsWithChildren) => {
  const pendingTasksRef = useRef<Set<string>>(new Set(REQUIRED_INITIAL_TASKS));
  const [pendingCount, setPendingCount] = useState<number>(REQUIRED_INITIAL_TASKS.length);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(true);
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);

  const syncPendingCount = useCallback(() => {
    setPendingCount(pendingTasksRef.current.size);
  }, []);

  const startTask = useCallback(
    (taskId: string) => {
      if (!isTracking) {
        return;
      }

      if (!pendingTasksRef.current.has(taskId)) {
        pendingTasksRef.current.add(taskId);
        syncPendingCount();
      }
    },
    [isTracking, syncPendingCount],
  );

  const completeTask = useCallback(
    (taskId: string) => {
      if (pendingTasksRef.current.delete(taskId)) {
        syncPendingCount();
      }
    },
    [syncPendingCount],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimumTimeElapsed(true);
    }, MIN_SCREEN_TIME_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!isTracking || !minimumTimeElapsed || pendingCount > 0) {
      return;
    }

    setIsInitialLoading(false);
    setIsTracking(false);
  }, [isTracking, minimumTimeElapsed, pendingCount]);

  // Mientras el splash cubre la pantalla, el contenido real ya está montado
  // detrás (para no bloquear su fetch) y puede ser más alto que el viewport
  // — sin este lock aparece un scrollbar de fondo debajo del overlay.
  useBodyScrollLock(isInitialLoading);

  // Refuerzo del lock: cubre <html> además de <body> (por si el navegador usa
  // el root como scroller) y fuerza scroll a 0 al montar — si el navegador
  // llegó a restaurar el scroll de una visita anterior (bfcache, back/forward)
  // antes de que corra este efecto, no queda visible detrás del splash.
  useEffect(() => {
    if (!isInitialLoading) return;
    const { documentElement } = document;
    const previousOverflow = documentElement.style.overflow;
    documentElement.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    return () => {
      documentElement.style.overflow = previousOverflow;
    };
  }, [isInitialLoading]);

  const value = useMemo<InitialLoadContextValue>(
    () => ({
      isInitialLoading,
      isTracking,
      startTask,
      completeTask,
    }),
    [completeTask, isInitialLoading, isTracking, startTask],
  );

  return (
    <InitialLoadContext.Provider value={value}>
      {isInitialLoading && <InitialLoadingScreen />}
      {children}
    </InitialLoadContext.Provider>
  );
};

export const useInitialLoad = () => {
  const context = useContext(InitialLoadContext);

  if (!context) {
    throw new Error('useInitialLoad must be used within an InitialLoadProvider');
  }

  return context;
};

export const useInitialLoadTask = (taskId: string, isPending: boolean) => {
  const { isTracking, startTask, completeTask } = useInitialLoad();

  useEffect(() => {
    if (!isTracking) {
      return;
    }

    if (isPending) {
      startTask(taskId);
    } else {
      completeTask(taskId);
    }

    return () => {
      completeTask(taskId);
    };
  }, [completeTask, isPending, isTracking, startTask, taskId]);
};

export const InitialRouteReady = ({ children }: PropsWithChildren) => {
  useInitialLoadTask('route', false);

  return <>{children}</>;
};