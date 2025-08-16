import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook para debounce de funções
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook para throttle de funções
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRun.current = Date.now();
        }, delay - (now - lastRun.current));
      }
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * Hook para lazy loading de componentes
 */
export function useLazyLoad<T>(
  factory: () => Promise<T>,
  deps: any[] = []
): [T | null, boolean, Error | null] {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const data = await factory();
        
        if (isMounted) {
          setState({ data, loading: false, error: null });
        }
      } catch (error) {
        if (isMounted) {
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: error instanceof Error ? error : new Error('Unknown error') 
          }));
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, deps);

  return [state.data, state.loading, state.error];
}

/**
 * Hook para otimizar re-renderizações com comparação profunda
 */
export function useDeepMemo<T>(value: T, deps: any[]): T {
  const ref = useRef<{ deps: any[]; value: T }>();

  if (!ref.current || !shallowEqual(ref.current.deps, deps)) {
    ref.current = { deps, value };
  }

  return ref.current.value;
}

/**
 * Hook para otimizar scroll events
 */
export function useScrollThrottle(
  callback: (event: Event) => void,
  delay: number = 16
) {
  const throttledCallback = useThrottle(callback, delay);

  useEffect(() => {
    window.addEventListener('scroll', throttledCallback, { passive: true });
    return () => window.removeEventListener('scroll', throttledCallback);
  }, [throttledCallback]);
}

/**
 * Hook para otimizar resize events
 */
export function useResizeThrottle(
  callback: (event: Event) => void,
  delay: number = 16
) {
  const throttledCallback = useThrottle(callback, delay);

  useEffect(() => {
    window.addEventListener('resize', throttledCallback, { passive: true });
    return () => window.removeEventListener('resize', throttledCallback);
  }, [throttledCallback]);
}

// Função auxiliar para comparação superficial
function shallowEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Import useState que estava faltando
import { useState } from 'react';
