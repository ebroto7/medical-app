/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Provides token-based CSRF protection for sensitive operations like:
 * - DELETE requests
 * - Connection management (disconnect, accept, reject)
 * - Profile/settings updates
 *
 * NOT needed for:
 * - GET requests (read-only)
 * - POST requests that create new resources (less sensitive)
 */

import { randomBytes, timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER = "x-csrf-token";

/**
 * Generate a cryptographically secure CSRF token
 * @returns Base64-encoded random token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("base64");
}

/**
 * Verify CSRF token using constant-time comparison
 * Prevents timing attacks that could leak token information
 *
 * @param request - The incoming request
 * @param expectedToken - The token stored in session/cookie
 * @returns true if tokens match, false otherwise
 */
export function verifyCSRFToken(
  request: Request,
  expectedToken: string | null | undefined
): boolean {
  const receivedToken = request.headers.get(CSRF_HEADER);

  // Both tokens must be present
  if (!receivedToken || !expectedToken) {
    logger.warn(
      {
        hasReceivedToken: !!receivedToken,
        hasExpectedToken: !!expectedToken,
      },
      "CSRF token validation failed - missing token"
    );
    return false;
  }

  try {
    // Convert to buffers for constant-time comparison
    const receivedBuffer = Buffer.from(receivedToken, "base64");
    const expectedBuffer = Buffer.from(expectedToken, "base64");

    // Lengths must match
    if (receivedBuffer.length !== expectedBuffer.length) {
      logger.warn("CSRF token validation failed - length mismatch");
      return false;
    }

    // Constant-time comparison prevents timing attacks
    const isValid = timingSafeEqual(receivedBuffer, expectedBuffer);

    if (!isValid) {
      logger.warn("CSRF token validation failed - token mismatch");
    }

    return isValid;
  } catch (error) {
    logger.error({ error }, "CSRF token validation error");
    return false;
  }
}

/**
 * Extract CSRF token from request headers
 * Useful for logging and debugging
 */
export function getCSRFTokenFromRequest(request: Request): string | null {
  return request.headers.get(CSRF_HEADER);
}

/**
 * Check if request should require CSRF protection
 * Based on HTTP method and endpoint
 */
export function requiresCSRFProtection(request: Request): boolean {
  const method = request.method;

  // Only protect state-changing operations
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return false;
  }

  // Protect sensitive DELETE operations
  if (method === "DELETE") {
    return true;
  }

  // Protect specific sensitive POST/PATCH endpoints
  const url = new URL(request.url);
  const sensitivePaths = [
    "/api/nutrition/disconnect",
    "/api/nutrition/accept-request",
    "/api/nutrition/reject-request",
  ];

  return sensitivePaths.some((path) => url.pathname.includes(path));
}
