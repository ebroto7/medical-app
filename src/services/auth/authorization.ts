/**
 * AuthorizationService
 * Single Responsibility: Validate user permissions and ownership
 */

import { createClient } from "@/utils/supabase/server";
import {
  AuthorizationError,
  OwnershipError,
  RoleError,
} from "@/lib/auth/errors";
import type { UserRole } from "@/lib/auth/constants";
import RoleService from "./role.service";

class AuthorizationService {
  private static instance: AuthorizationService;

  private constructor() {}

  static getInstance(): AuthorizationService {
    if (!AuthorizationService.instance) {
      AuthorizationService.instance = new AuthorizationService();
    }
    return AuthorizationService.instance;
  }

  async requireRole(userId: string, allowedRoles: UserRole[]): Promise<void> {
    const userRole = await RoleService.getRoleForUser(userId);
    if (!userRole || !allowedRoles.includes(userRole)) {
      const rolesStr = allowedRoles.join(", ");
      throw new RoleError(`User role not in allowed roles: ${rolesStr}`);
    }
  }

  requireOwnership(userId: string, resourceOwnerId: string): void {
    if (userId !== resourceOwnerId) {
      throw new OwnershipError("User is not the owner of this resource");
    }
  }

  async requireConnection(userId: string, patientId: string, nutritionistId: string): Promise<void> {
    if (userId !== patientId && userId !== nutritionistId) {
      throw new AuthorizationError("User is not part of this connection");
    }
    if (userId !== patientId) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("patient_nutritionist_connections")
        .select("id")
        .eq("patient_id", patientId)
        .eq("nutritionist_id", nutritionistId)
        .eq("status", "approved")
        .single();
      if (error || !data) {
        throw new AuthorizationError("Nutritionist is not connected to this patient");
      }
    }
  }

  async canAccessPatientData(userId: string, patientId: string): Promise<boolean> {
    if (userId === patientId) return true;
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("patient_nutritionist_connections")
        .select("id")
        .eq("patient_id", patientId)
        .eq("nutritionist_id", userId)
        .eq("status", "approved")
        .single();
      return !!data;
    } catch {
      return false;
    }
  }
}

export default AuthorizationService.getInstance();
