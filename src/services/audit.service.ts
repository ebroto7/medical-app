/**
 * Audit Logging Service
 *
 * Provides centralized audit logging for security-sensitive operations.
 * Tracks user actions for compliance, security monitoring, and debugging.
 *
 * What to log:
 * - Authentication events (login, logout, signup)
 * - Authorization failures (access denied)
 * - Data modifications (create, update, delete)
 * - Connection management (request, accept, reject, disconnect)
 * - Sensitive operations (meal plan changes, profile updates)
 *
 * What NOT to log:
 * - PII/sensitive data in details field
 * - Passwords or tokens
 * - Full request/response bodies
 */

import { createClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Audit action types
 * Naming convention: resource.action
 */
export type AuditAction =
  // Authentication
  | "user.signup"
  | "user.login"
  | "user.logout"
  // Connections
  | "connection.request"
  | "connection.accept"
  | "connection.reject"
  | "connection.disconnect"
  // Meal Plans
  | "meal_plan.create"
  | "meal_plan.update"
  | "meal_plan.delete"
  // Nutrition Entries
  | "entry.create"
  | "entry.update"
  | "entry.delete"
  // Training Sessions
  | "session.create"
  | "session.update"
  | "session.delete"
  // Comments
  | "comment.create"
  | "comment.update"
  | "comment.delete"
  // Security Events
  | "security.suspicious_activity"
  | "security.potential_attack"
  | "security.unauthorized_access"
  | "security.rate_limit_exceeded";

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 * Non-blocking - logs errors but doesn't throw
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("audit_log").insert({
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      details: entry.details,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
    });

    if (error) {
      // Log error but don't throw - audit logging shouldn't break the app
      logger.error({ error, entry }, "Failed to create audit log");
    } else {
      logger.debug({ action: entry.action }, "Audit log created");
    }
  } catch (error) {
    logger.error({ error, entry }, "Audit logging error");
  }
}

/**
 * Extract client information from request
 */
export function getClientInfo(req: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ipAddress = forwarded?.split(",")[0] || realIp || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  return { ipAddress, userAgent };
}

/**
 * Create audit log for successful operation
 */
export async function auditSuccess(
  req: Request,
  userId: string,
  action: AuditAction,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>
): Promise<void> {
  const { ipAddress, userAgent } = getClientInfo(req);

  await createAuditLog({
    userId,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent,
  });
}

/**
 * Create audit log for failed/unauthorized operation
 */
export async function auditFailure(
  req: Request,
  action: AuditAction,
  reason: string,
  userId?: string,
  details?: Record<string, any>
): Promise<void> {
  const { ipAddress, userAgent } = getClientInfo(req);

  await createAuditLog({
    userId,
    action,
    resourceType: "security_event",
    details: {
      reason,
      ...details,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Query audit logs for a user
 * (For admin dashboards or user transparency features)
 */
export async function getUserAuditLogs(
  userId: string,
  limit = 50,
  offset = 0
): Promise<any[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error({ error }, "Failed to fetch audit logs");
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ error }, "Error fetching audit logs");
    return [];
  }
}
