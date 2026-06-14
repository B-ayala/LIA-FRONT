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

type InitialLoadContextValue = {
  isInitialLoading: boolean;
  isTracking: boolean;
  startTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
};

const REQUIRED_INITIAL_TASKS = ['auth', 'window', 'route', 'public-layout'] as const;
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