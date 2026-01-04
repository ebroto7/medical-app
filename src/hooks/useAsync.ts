"use client";

import { useState, useCallback, useEffect, DependencyList } from "react";

/**
 * State for async operations
 */
interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Return type for useAsync hook
 */
interface UseAsyncReturn<T> extends AsyncState<T> {
  /** Execute the async function manually */
  execute: () => Promise<T | null>;
  /** Reset state to initial values */
  reset: () => void;
  /** Set data manually (for optimistic updates) */
  setData: (data: T | null | ((prev: T | null) => T | null)) => void;
}

/**
 * Options for useAsync hook
 */
export interface UseAsyncOptions<T = unknown> {
  /** Whether to execute immediately on mount (default: true) */
  immediate?: boolean;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook for managing async operations with loading, error, and data states.
 *
 * @example
 * ```tsx
 * // Basic usage - fetch on mount
 * const { data, isLoading, error } = useAsync(
 *   () => NutritionService.getEntries(userId),
 *   [userId]
 * );
 *
 * // Manual execution
 * const { execute, isLoading } = useAsync(
 *   () => NutritionService.deleteEntry(id),
 *   [],
 *   { immediate: false }
 * );
 * await execute();
 *
 * // With optimistic updates
 * const { data, setData, execute } = useAsync(...);
 * setData(prev => prev.filter(item => item.id !== deletedId)); // Optimistic
 * try {
 *   await execute();
 * } catch {
 *   setData(originalData); // Rollback
 * }
 * ```
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  deps: DependencyList = [],
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T> {
  const { immediate = true, onSuccess, onError } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: immediate,
    error: null,
  });

  const execute = useCallback(async (): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await asyncFunction();
      setState({ data: result, isLoading: false, error: null });
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState(prev => ({ ...prev, isLoading: false, error }));
      onError?.(error);
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asyncFunction, ...deps]);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  const setData = useCallback((
    updater: T | null | ((prev: T | null) => T | null)
  ) => {
    setState(prev => ({
      ...prev,
      data: typeof updater === "function"
        ? (updater as (prev: T | null) => T | null)(prev.data)
        : updater,
    }));
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}

/**
 * Hook for async operations that don't need immediate execution.
 * Alias for useAsync with immediate: false.
 *
 * @example
 * ```tsx
 * const { execute, isLoading } = useLazyAsync(
 *   () => NutritionService.createEntry(data)
 * );
 *
 * const handleSubmit = async () => {
 *   const result = await execute();
 *   if (result) {
 *     toast({ title: "Success" });
 *   }
 * };
 * ```
 */
export function useLazyAsync<T>(
  asyncFunction: () => Promise<T>,
  options: Omit<UseAsyncOptions, "immediate"> = {}
): UseAsyncReturn<T> {
  return useAsync(asyncFunction, [], { ...options, immediate: false });
}
