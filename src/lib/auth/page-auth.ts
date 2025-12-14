/**
 * Page Authentication Helpers
 * Server-side auth guards for use in Server Components
 * Following Next.js 16 best practices: auth checks at the page level
 */

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { RoleService } from "@/services/auth";
import type { UserRole } from "./constants";

export interface PageAuthUser {
    id: string;
    email: string;
}

export interface PageAuthUserWithRole extends PageAuthUser {
    role: UserRole;
}

/**
 * Get current authenticated user without redirecting
 * Use when you need to check auth but handle unauthenticated state yourself
 */
export async function getPageAuth(): Promise<PageAuthUser | null> {
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    return {
        id: user.id,
        email: user.email || "",
    };
}

/**
 * Require user to be authenticated
 * Redirects to login if not authenticated
 * Use at the start of protected Server Components
 */
export async function requirePageAuth(): Promise<PageAuthUser> {
    const user = await getPageAuth();

    if (!user) {
        redirect("/auth/login");
    }

    return user;
}

/**
 * Require user to have specific role(s)
 * Redirects to login if not authenticated
 * Redirects to appropriate dashboard if wrong role
 */
export async function requirePageRole(
    allowedRoles: UserRole[]
): Promise<PageAuthUserWithRole> {
    const user = await requirePageAuth();

    const role = await RoleService.getRoleForUser(user.id);

    if (!role || !allowedRoles.includes(role)) {
        // Redirect to appropriate dashboard based on actual role
        if (role === "nutritionist") {
            redirect("/dashboard/nutritionist");
        } else if (role === "patient") {
            redirect("/dashboard/patient");
        } else {
            // No role found, redirect to login
            redirect("/auth/login");
        }
    }

    return { ...user, role };
}

/**
 * Get user with role without redirecting
 * Use when you need to check role but handle unauthorized state yourself
 */
export async function getPageAuthWithRole(): Promise<PageAuthUserWithRole | null> {
    const user = await getPageAuth();

    if (!user) {
        return null;
    }

    const role = await RoleService.getRoleForUser(user.id);

    if (!role) {
        return null;
    }

    return { ...user, role };
}
