import { useState, useEffect, useCallback } from 'react';
import type { ApiResponse } from '../lib/api';

// Generic API state hook
export function useApiState<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <R = T>(
    apiCall: () => Promise<ApiResponse<R>>,
    onSuccess?: (data: R) => void,
    onError?: (error: string) => void
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall();

      if (response.success && response.data) {
        setData(response.data as unknown as T);
        onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'An error occurred';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData,
  };
}

// Projects hook
export function useProjects() {
  return useApiState<any[]>();
}

// Single project hook
export function useProject() {
  return useApiState<any>();
}

// Tasks hook
export function useTasks() {
  return useApiState<any[]>();
}

// Single task hook
export function useTask() {
  return useApiState<any>();
}

// API health check hook
export function useApiHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/health');
      setIsHealthy(response.ok);
    } catch {
      setIsHealthy(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    isHealthy,
    checking,
    checkHealth,
  };
}
