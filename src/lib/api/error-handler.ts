/**
 * Centralized API Error Handler
 *
 * This module eliminates duplicated error handling code across 30+ API routes.
 * Previously, each route had its own try-catch with the same pattern.
 *
 * Usage:
 * ```typescript
 * // Before (duplicated in every route):
 * export async function GET(request: Request) {
 *   try {
 *     const user = await requireAuth();
 *     // ... logic
 *   } catch (error) {
 *     if (error instanceof AuthenticationError) {...}
 *     if (error instanceof ZodError) {...}
 *     return Response.json({ error: "Internal server error" }, { status: 500 });
 *   }
 * }
 *
 * // After (clean route):
 * export const GET = withErrorHandler(async (request) => {
 *   const user = await requireAuth();
 *   // ... logic - just throw errors, they'll be handled
 *   return Response.json({ success: true, data });
 * });
 * ```
 */

import { ZodError } from "zod";
import { logger } from "@/lib/logger";
import {
  AuthenticationError,
  AuthorizationError,
  OwnershipError,
  RoleError,
  ValidationError,
} from "@/lib/auth/errors";

/**
 * Standard API response format
 */
interface ApiErrorResponse {
  error: string;
  details?: unknown;
  code?: string;
}

/**
 * HTTP status codes for different error types
 */
const ERROR_STATUS_CODES: Record<string, number> = {
  AuthenticationError: 401,
  AuthorizationError: 403,
  OwnershipError: 403,
  RoleError: 403,
  ValidationError: 400,
  ZodError: 400,
  NotFoundError: 404,
  ConflictError: 409,
  RateLimitError: 429,
};

/**
 * Custom error class for Not Found scenarios
 */
export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Custom error class for Conflict scenarios (e.g., duplicate entry)
 */
export class ConflictError extends Error {
  details?: Record<string, unknown>;

  constructor(message = "Conflict", details?: Record<string, unknown>) {
    super(message);
    this.name = "ConflictError";
    this.details = details;
  }
}

/**
 * Custom error class for Rate Limiting
 */
export class RateLimitError extends Error {
  retryAfter?: number;

  constructor(message = "Rate limit exceeded", retryAfter?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Map an error to an API response
 */
export function errorToResponse(error: unknown): Response {
  // Known error types
  if (error instanceof AuthenticationError) {
    return Response.json(
      { error: error.message, code: "AUTH_ERROR" } as ApiErrorResponse,
      { status: 401 }
    );
  }

  if (error instanceof AuthorizationError || error instanceof OwnershipError) {
    return Response.json(
      { error: "Access denied", code: "FORBIDDEN" } as ApiErrorResponse,
      { status: 403 }
    );
  }

  if (error instanceof RoleError) {
    return Response.json(
      { error: "Insufficient permissions", code: "ROLE_ERROR" } as ApiErrorResponse,
      { status: 403 }
    );
  }

  if (error instanceof ValidationError) {
    return Response.json(
      { error: error.message, code: "VALIDATION_ERROR" } as ApiErrorResponse,
      { status: 400 }
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "Validation error",
        details: error.issues,
        code: "VALIDATION_ERROR",
      } as ApiErrorResponse,
      { status: 400 }
    );
  }

  if (error instanceof NotFoundError) {
    return Response.json(
      { error: error.message, code: "NOT_FOUND" } as ApiErrorResponse,
      { status: 404 }
    );
  }

  if (error instanceof ConflictError) {
    return Response.json(
      {
        error: error.message,
        details: error.details,
        code: "CONFLICT",
      } as ApiErrorResponse,
      { status: 409 }
    );
  }

  if (error instanceof RateLimitError) {
    const headers: Record<string, string> = {};
    if (error.retryAfter) {
      headers["Retry-After"] = String(error.retryAfter);
    }
    return Response.json(
      { error: error.message, code: "RATE_LIMITED" } as ApiErrorResponse,
      { status: 429, headers }
    );
  }

  // Unknown error - log and return generic message
  logger.error({ error }, "Unhandled API error");

  return Response.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" } as ApiErrorResponse,
    { status: 500 }
  );
}

/**
 * Route handler type (Next.js App Router)
 */
type RouteHandler = (
  request: Request,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<Response>;

/**
 * Wrap a route handler with centralized error handling.
 *
 * @example
 * ```typescript
 * // In route.ts
 * export const GET = withErrorHandler(async (request, context) => {
 *   const user = await requireAuth();
 *   const { id } = await context.params;
 *
 *   const { data, error } = await supabase
 *     .from("entries")
 *     .select("*")
 *     .eq("id", id)
 *     .single();
 *
 *   if (error || !data) {
 *     throw new NotFoundError("Entry not found");
 *   }
 *
 *   return Response.json({ success: true, data });
 * });
 * ```
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorToResponse(error);
    }
  };
}

/**
 * Higher-order function for handlers that need request logging.
 *
 * @example
 * ```typescript
 * export const POST = withErrorHandler(
 *   withLogging("nutrition.create", async (request) => {
 *     // handler...
 *   })
 * );
 * ```
 */
export function withLogging(
  action: string,
  handler: RouteHandler
): RouteHandler {
  return async (request, context) => {
    const startTime = Date.now();

    try {
      const response = await handler(request, context);
      const duration = Date.now() - startTime;

      logger.info(
        {
          action,
          method: request.method,
          url: request.url,
          status: response.status,
          duration,
        },
        `API request completed`
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(
        {
          action,
          method: request.method,
          url: request.url,
          duration,
          error,
        },
        `API request failed`
      );

      throw error; // Re-throw for withErrorHandler to catch
    }
  };
}

/**
 * Create a standardized success response.
 */
export function successResponse<T>(
  data: T,
  status = 200
): Response {
  return Response.json({ success: true, data }, { status });
}

/**
 * Create a standardized created response.
 */
export function createdResponse<T>(data: T): Response {
  return successResponse(data, 201);
}

/**
 * Create a standardized no-content response.
 */
export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}
