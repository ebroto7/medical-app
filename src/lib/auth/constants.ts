/**
 * Authentication Constants
 * Centralized configuration for roles, routes, and auth settings
 */

export const VALID_ROLES = ["patient", "nutritionist"] as const;
export type UserRole = (typeof VALID_ROLES)[number];

// Role-based route mapping
export const ROLE_ROUTES: Record<UserRole, string> = {
  patient: "/dashboard/patient",
  nutritionist: "/dashboard/nutritionist",
};

// Default redirect routes per role
export const DEFAULT_ROLE_ROUTES: Record<UserRole, string> = {
  patient: "/dashboard/patient",
  nutritionist: "/dashboard/nutritionist",
};

// Routes that require authentication
export const PROTECTED_ROUTES = ["/diary", "/dashboard"];

// Routes for authentication (login, signup)
export const AUTH_ROUTES = ["/auth/login", "/auth/signup"];

// Token refresh interval (50 minutes - Supabase default is 60 minutes)
export const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000;

// Role cache TTL (5 minutes)
export const ROLE_CACHE_TTL = 5 * 60 * 1000;
