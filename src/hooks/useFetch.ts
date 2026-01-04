"use client";

import { useCallback, DependencyList } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAsync, type UseAsyncOptions } from "./useAsync";

/**
 * API response wrapper type
 */
interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Options for useFetch hook
 */
interface UseFetchOptions<T> extends Omit<UseAsyncOptions<T>, "onSuccess"> {
  /** Search params to append to URL */
  params?: Record<string, string | number | boolean | undefined>;
  /** Whether to include auth header (default: true) */
  requiresAuth?: boolean;
  /** Transform response data */
  transform?: (response: ApiResponse<T>) => T;
  /** Callback on success with transformed data */
  onSuccess?: (data: T) => void;
}

/**
 * Hook for fetching data from API with automatic auth headers.
 *
 * @example
 * ```tsx
 * // Basic fetch
 * const { data, isLoading, error } = useFetch<NutritionEntry[]>(
 *   "/api/nutrition/entries",
 *   { params: { userId, date } },
 *   [userId, date]
 * );
 *
 * // Without auth
 * const { data } = useFetch<HealthCheck>(
 *   "/api/health",
 *   { requiresAuth: false }
 * );
 *
 * // With transform
 * const { data } = useFetch<Plan[]>(
 *   "/api/meal-plans",
 *   { transform: (res) => res.data || [] }
 * );
 * ```
 */
export function useFetch<T>(
  url: string,
  options: UseFetchOptions<T> = {},
  deps: DependencyList = []
) {
  const { token } = useAuth();
  const {
    params,
    requiresAuth = true,
    transform,
    onSuccess,
    onError,
    immediate = true,
  } = options;

  const fetchData = useCallback(async (): Promise<T> => {
    // Build URL with params
    const fetchUrl = new URL(url, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          fetchUrl.searchParams.set(key, String(value));
        }
      });
    }

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (requiresAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Fetch
    const response = await fetch(fetchUrl.toString(), { headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const json: ApiResponse<T> = await response.json();

    // Transform or extract data
    if (transform) {
      return transform(json);
    }

    // Default: return data property or entire response
    return (json.data ?? json) as T;
  }, [url, params, requiresAuth, token, transform]);

  return useAsync<T>(fetchData, [url, token, JSON.stringify(params), ...deps], {
    immediate,
    onSuccess,
    onError,
  });
}

/**
 * Options for useMutation hook
 */
interface UseMutationOptions<T, TVariables> {
  /** HTTP method (default: POST) */
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  /** Transform response data */
  transform?: (response: ApiResponse<T>) => T;
  /** Callback on success */
  onSuccess?: (data: T, variables: TVariables) => void;
  /** Callback on error */
  onError?: (error: Error, variables: TVariables) => void;
}

/**
 * Hook for mutating data (POST, PUT, PATCH, DELETE) with automatic auth.
 *
 * @example
 * ```tsx
 * const { mutate, isLoading, error } = useMutation<Entry, CreateEntryData>(
 *   "/api/nutrition/entries",
 *   {
 *     onSuccess: (data) => {
 *       toast({ title: "Entry created" });
 *       router.refresh();
 *     },
 *   }
 * );
 *
 * const handleSubmit = async (data: CreateEntryData) => {
 *   await mutate(data);
 * };
 * ```
 */
export function useMutation<T, TVariables = unknown>(
  url: string,
  options: UseMutationOptions<T, TVariables> = {}
) {
  const { token } = useAuth();
  const { method = "POST", transform, onSuccess, onError } = options;

  const {
    data,
    isLoading,
    error,
    execute: _execute,
    reset,
  } = useAsync<T>(async () => {
    throw new Error("Use mutate() with variables");
  }, [], { immediate: false });

  const mutate = useCallback(async (variables: TVariables): Promise<T | null> => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const json: ApiResponse<T> = await response.json();
      const result = transform ? transform(json) : ((json.data ?? json) as T);

      onSuccess?.(result, variables);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error, variables);
      throw error;
    }
  }, [url, method, token, transform, onSuccess, onError]);

  return {
    data,
    isLoading,
    error,
    mutate,
    reset,
  };
}

/**
 * Hook for DELETE operations with simpler API.
 *
 * @example
 * ```tsx
 * const { remove, isLoading } = useDelete("/api/nutrition/entries");
 *
 * const handleDelete = async (id: string) => {
 *   if (confirm("Delete?")) {
 *     await remove(id);
 *   }
 * };
 * ```
 */
export function useDelete(baseUrl: string, options: Omit<UseMutationOptions<void, string>, "method"> = {}) {
  const { token } = useAuth();
  const { onSuccess, onError } = options;

  const { isLoading, error, execute: _execute, reset } = useAsync<void>(
    async () => { throw new Error("Use remove() with id"); },
    [],
    { immediate: false }
  );

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      onSuccess?.(undefined, id);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error, id);
      return false;
    }
  }, [baseUrl, token, onSuccess, onError]);

  return {
    isLoading,
    error,
    remove,
    reset,
  };
}
