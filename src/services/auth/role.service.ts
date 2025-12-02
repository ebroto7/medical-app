/**
 * RoleService
 * Single Responsibility: Manage user roles with caching to avoid duplicate database queries
 * Cache TTL: 5 minutes to balance freshness and performance
 */

import { createClient } from "@/utils/supabase/server";
import { ROLE_CACHE_TTL } from "@/lib/auth/constants";
import type { UserRole } from "@/lib/auth/constants";

interface CachedRole {
  role: UserRole | null;
  timestamp: number;
}

class RoleService {
  private static instance: RoleService;
  private roleCache: Map<string, CachedRole> = new Map();

  private constructor() {}

  static getInstance(): RoleService {
    if (!RoleService.instance) {
      RoleService.instance = new RoleService();
    }
    return RoleService.instance;
  }

  /**
   * Get user role from cache or database
   * Returns null if user has no profile or role
   */
  async getRoleForUser(userId: string): Promise<UserRole | null> {
    // Check cache first
    const cached = this.roleCache.get(userId);
    if (cached && Date.now() - cached.timestamp < ROLE_CACHE_TTL) {
      return cached.role;
    }

    try {
      const supabase = await createClient();
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error || !profile) {
        // Cache the null result
        this.roleCache.set(userId, {
          role: null,
          timestamp: Date.now(),
        });
        return null;
      }

      const role = profile.role as UserRole;
      // Cache the result
      this.roleCache.set(userId, {
        role,
        timestamp: Date.now(),
      });

      return role;
    } catch (error) {
      console.error("[RoleService] Error fetching role:", error);
      return null;
    }
  }

  /**
   * Invalidate role cache for a user
   * Call this when user role is updated
   */
  invalidateRoleCache(userId: string): void {
    this.roleCache.delete(userId);
  }

  /**
   * Clear entire role cache
   * Use sparingly - typically only on logout
   */
  clearCache(): void {
    this.roleCache.clear();
  }
}

export default RoleService.getInstance();
