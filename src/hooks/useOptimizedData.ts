/**
 * Optimized Data Hooks with Caching and Performance Enhancement
 * Enterprise-grade data fetching with React Query patterns
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// Cache implementation
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize = 100; // Maximum cache entries

  set(key: string, data: any, ttlMinutes: number = 5): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    if (key) {
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const globalCache = new DataCache();

interface QueryOptions {
  cacheTime?: number; // minutes
  staleTime?: number; // minutes
  refetchOnWindowFocus?: boolean;
  retry?: number;
  retryDelay?: number;
}

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

// Optimized data fetching hook
export function useOptimizedQuery<T>(
  queryKey: string | string[],
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): QueryState<T> {
  const {
    cacheTime = 5,
    staleTime = 1,
    refetchOnWindowFocus = true,
    retry = 3,
    retryDelay = 1000
  } = options;

  const cacheKey = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;

  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  }>({
    data: globalCache.get(cacheKey),
    isLoading: !globalCache.get(cacheKey),
    isError: false,
    error: null
  });

  const fetchData = useCallback(async (retryCount = 0) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, isError: false, error: null }));

      const data = await queryFn();
      globalCache.set(cacheKey, data, cacheTime);

      setState({
        data,
        isLoading: false,
        isError: false,
        error: null
      });
    } catch (error) {
      if (retryCount < retry) {
        setTimeout(() => {
          fetchData(retryCount + 1);
        }, retryDelay * Math.pow(2, retryCount));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isError: true,
          error: error as Error
        }));
      }
    }
  }, [cacheKey, queryFn, cacheTime, retry, retryDelay]);

  const refetch = useCallback(async () => {
    globalCache.delete(cacheKey);
    await fetchData();
  }, [cacheKey, fetchData]);

  const invalidate = useCallback(() => {
    globalCache.delete(cacheKey);
  }, [cacheKey]);

  // Check if data is stale
  const isStale = useMemo(() => {
    const cached = globalCache.get(cacheKey);
    if (!cached) return true;

    const entry = globalCache['cache'].get(cacheKey);
    if (!entry) return true;

    return Date.now() - entry.timestamp > staleTime * 60 * 1000;
  }, [cacheKey, staleTime]);

  // Fetch data on mount or when stale
  useEffect(() => {
    if (!state.data || isStale) {
      fetchData();
    }
  }, [fetchData, state.data, isStale]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (isStale) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, fetchData]);

  return {
    ...state,
    refetch,
    invalidate
  };
}

// Optimized clinic data hook
export function useOptimizedClinics() {
  return useOptimizedQuery(
    'clinics',
    async () => {
      // Simulate API call - replace with actual Supabase call
      const response = await new Promise<any[]>(resolve => {
        setTimeout(() => {
          resolve([
            { id: '1', name: 'Test Clinic 1', status: 'active', cards: 150 },
            { id: '2', name: 'Test Clinic 2', status: 'active', cards: 220 },
            { id: '3', name: 'Test Clinic 3', status: 'active', cards: 180 }
          ]);
        }, 500);
      });
      return response;
    },
    { cacheTime: 10, staleTime: 2 }
  );
}

// Optimized cards data hook
export function useOptimizedCards(clinicId?: string) {
  const queryKey = clinicId ? ['cards', clinicId] : ['cards'];

  return useOptimizedQuery(
    queryKey,
    async () => {
      // Simulate API call - replace with actual Supabase call
      const response = await new Promise<any[]>(resolve => {
        setTimeout(() => {
          const mockCards = Array.from({ length: 50 }, (_, i) => ({
            id: `card-${i + 1}`,
            controlNumber: `MOC${String(i + 1).padStart(8, '0')}`,
            status: ['active', 'inactive', 'expired'][Math.floor(Math.random() * 3)],
            clinicId: clinicId || `clinic-${Math.floor(Math.random() * 5) + 1}`,
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          }));
          resolve(mockCards);
        }, 300);
      });
      return response;
    },
    { cacheTime: 15, staleTime: 5 }
  );
}

// Optimized analytics data hook
export function useOptimizedAnalytics(dateRange?: { start: string; end: string }) {
  const queryKey = dateRange ? ['analytics', dateRange.start, dateRange.end] : ['analytics'];

  return useOptimizedQuery(
    queryKey,
    async () => {
      // Simulate analytics API call
      const response = await new Promise<any>(resolve => {
        setTimeout(() => {
          resolve({
            totalClinics: Math.floor(Math.random() * 100) + 200,
            totalCards: Math.floor(Math.random() * 10000) + 50000,
            activeUsers: Math.floor(Math.random() * 1000) + 2000,
            revenue: Math.floor(Math.random() * 100000) + 500000,
            growth: {
              clinics: Math.floor(Math.random() * 20) + 5,
              cards: Math.floor(Math.random() * 30) + 10,
              revenue: Math.floor(Math.random() * 25) + 15
            }
          });
        }, 800);
      });
      return response;
    },
    { cacheTime: 30, staleTime: 10 }
  );
}

// Mutation hook for data updates
export function useOptimizedMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: Error, variables: V) => void;
    invalidateQueries?: string[];
  } = {}
) {
  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  }>({
    data: null,
    isLoading: false,
    isError: false,
    error: null
  });

  const mutate = useCallback(async (variables: V) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, isError: false, error: null }));

      const data = await mutationFn(variables);

      setState({
        data,
        isLoading: false,
        isError: false,
        error: null
      });

      // Invalidate related queries
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          globalCache.delete(queryKey);
        });
      }

      options.onSuccess?.(data, variables);

      return data;
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        error: err
      }));

      options.onError?.(err, variables);
      throw error;
    }
  }, [mutationFn, options]);

  return {
    ...state,
    mutate
  };
}

// Background sync hook
export function useBackgroundSync() {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Simulate background sync
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clear cache to force fresh data
      globalCache.clear();
      setLastSync(new Date());

      console.log('✅ Background sync completed');
    } catch (error) {
      console.error('❌ Background sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Auto-sync every 5 minutes
  useEffect(() => {
    const interval = setInterval(sync, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [sync]);

  return { lastSync, isSyncing, sync };
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    cacheSize: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    totalRequests: 0
  });

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics({
        cacheSize: globalCache.size(),
        cacheHitRate: Math.random() * 30 + 70, // Mock data
        averageResponseTime: Math.random() * 200 + 100, // Mock data
        totalRequests: Math.floor(Math.random() * 1000) + 500 // Mock data
      });
    };

    const interval = setInterval(updateMetrics, 10000); // Update every 10 seconds
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, []);

  return metrics;
}

export { globalCache };