/**
 * API Route Helpers
 * Reusable functions to reduce boilerplate in API routes
 * Centralizes authentication and authorization validation
 */

import { createClient } from "@/utils/supabase/server";
import { AuthenticationError } from "./errors";
import { RoleService, AuthorizationService } from "@/services/auth";
import type { AuthUser } from "@/services/auth";
import type { UserRole } from "./constants";

/**
 * Require user to be authenticated
 * Throws AuthenticationError if user is not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      throw new AuthenticationError("Unauthorized");
    }

    return {
      id: user.id,
      email: user.email || "",
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError("Authentication failed");
  }
}

/**
 * Require user to have specific role(s)
 * Throws RoleError if user doesn't have required role
 */
export async function requireRole(
  userId: string,
  allowedRoles: UserRole[]
): Promise<void> {
  await AuthorizationService.requireRole(userId, allowedRoles);
}

/**
 * Require user to own a resource
 * Throws OwnershipError if user is not the resource owner
 */
export function requireOwnership(
  userId: string,
  resourceOwnerId: string
): void {
  AuthorizationService.requireOwnership(userId, resourceOwnerId);
}

/**
 * Require nutritionist to be connected to patient
 * Throws AuthorizationError if not connected
 */
export async function requireConnection(
  userId: string,
  patientId: string,
  nutritionistId: string
): Promise<void> {
  await AuthorizationService.requireConnection(userId, patientId, nutritionistId);
}

/**
 * Get user role without throwing if not found
 * Useful for conditional logic in endpoints
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  return RoleService.getRoleForUser(userId);
}

/**
 * Check if user can access patient data
 * Returns true if user is patient or connected nutritionist
 */
export async function canAccessPatientData(
  userId: string,
  patientId: string
): Promise<boolean> {
  return AuthorizationService.canAccessPatientData(userId, patientId);
}
