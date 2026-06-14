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
import { useLocation } from 'react-router-dom';
import NavigationLoadingScreen from './NavigationLoadingScreen';

type NavigationLoadContextValue = {
  isNavigationLoading: boolean;
  completeNavigation: () => void;
};

const NAVIGATION_MIN_SCREEN_TIME_MS = 300;

const NavigationLoadContext = createContext<NavigationLoadContextValue | null>(null);

export const NavigationLoadProvider = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const [isNavigationLoading, setIsNavigationLoading] = useState(false);
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const previousPathRef = useRef(location.pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const completeNavigation = useCallback(() => {
    if (!minimumTimeElapsed) {
      return;
    }
    setIsNavigationLoading(false);
  }, [minimumTimeElapsed]);

  // Detect route change
  useEffect(() => {
    if (location.pathname !== previousPathRef.current) {
      previousPathRef.current = location.pathname;
      setIsNavigationLoading(true);
      setMinimumTimeElapsed(false);

      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set minimum time for loading screen visibility
      timerRef.current = setTimeout(() => {
        setMinimumTimeElapsed(true);
      }, NAVIGATION_MIN_SCREEN_TIME_MS);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [location.pathname]);

  // Auto-hide loading after minimum time + some content rendering
  useEffect(() => {
    if (isNavigationLoading && minimumTimeElapsed) {
      // Give content time to render
      const hideTimer = setTimeout(() => {
        setIsNavigationLoading(false);
      }, 100);

      return () => clearTimeout(hideTimer);
    }
  }, [minimumTimeElapsed, isNavigationLoading]);

  const value = useMemo<NavigationLoadContextValue>(
    () => ({
      isNavigationLoading,
      completeNavigation,
    }),
    [isNavigationLoading, completeNavigation],
  );

  return (
    <NavigationLoadContext.Provider value={value}>
      {children}
      {isNavigationLoading && <NavigationLoadingScreen />}
    </NavigationLoadContext.Provider>
  );
};

export const useNavigationLoad = () => {
  const context = useContext(NavigationLoadContext);

  if (!context) {
    throw new Error('useNavigationLoad must be used within a NavigationLoadProvider');
  }

  return context;
};
