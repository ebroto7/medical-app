/**
 * Base API Client
 *
 * Provides a consistent interface for making API calls with:
 * - Automatic auth header injection
 * - Consistent error handling
 * - Type-safe responses
 */

import { API_ENDPOINTS } from "@/config/constants";

export { API_ENDPOINTS };

/**
 * Standard API response format
 */
export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Valid param value types
 */
type ParamValue = string | number | boolean | undefined | null;

/**
 * Options for API requests
 */
interface RequestOptions {
  /** Request body (will be JSON.stringified) */
  body?: unknown;
  /** URL search params - can be any object with string keys */
  params?: Record<string, ParamValue> | { [key: string]: ParamValue };
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

/**
 * API Error with status code and details
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Build URL with query parameters
 */
function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  const url = new URL(endpoint, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Create request headers with optional auth token
 */
function createHeaders(
  token?: string | null,
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...additionalHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Parse API response and throw on error
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const json: ApiResponse<T> = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      json.error || `HTTP ${response.status}`,
      response.status,
      (json as { code?: string }).code,
      json.details
    );
  }

  // Return data property if present, otherwise entire response
  return (json.data ?? json) as T;
}

/**
 * Create an API client with the given auth token
 */
export function createApiClient(token?: string | null) {
  return {
    /**
     * GET request
     */
    async get<T>(endpoint: string, options: Omit<RequestOptions, "body"> = {}): Promise<T> {
      const url = buildUrl(endpoint, options.params);
      const headers = createHeaders(token, options.headers);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      return parseResponse<T>(response);
    },

    /**
     * POST request
     */
    async post<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
      const url = buildUrl(endpoint, options.params);
      const headers = createHeaders(token, options.headers);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      return parseResponse<T>(response);
    },

    /**
     * PUT request
     */
    async put<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
      const url = buildUrl(endpoint, options.params);
      const headers = createHeaders(token, options.headers);

      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      return parseResponse<T>(response);
    },

    /**
     * PATCH request
     */
    async patch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
      const url = buildUrl(endpoint, options.params);
      const headers = createHeaders(token, options.headers);

      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      return parseResponse<T>(response);
    },

    /**
     * DELETE request
     */
    async delete<T = void>(endpoint: string, options: Omit<RequestOptions, "body"> = {}): Promise<T> {
      const url = buildUrl(endpoint, options.params);
      const headers = createHeaders(token, options.headers);

      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      return parseResponse<T>(response);
    },

    /**
     * Upload file (multipart/form-data)
     */
    async upload<T>(endpoint: string, formData: FormData): Promise<T> {
      const url = buildUrl(endpoint);
      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      // Don't set Content-Type for FormData - browser will set it with boundary

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      return parseResponse<T>(response);
    },
  };
}

/**
 * Type for the API client
 */
export type ApiClient = ReturnType<typeof createApiClient>;
