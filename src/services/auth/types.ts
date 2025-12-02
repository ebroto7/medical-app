/**
 * Shared types for authentication services
 */

import type { UserRole } from "@/lib/auth/constants";

export interface AuthUser {
  id: string;
  email: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface SignInResponse {
  user: AuthUser;
  role: UserRole | null;
}

export interface SignUpResponse {
  user: AuthUser;
  profile: UserProfile;
}

export interface CurrentUserResponse {
  user: AuthUser | null;
  role: UserRole | null;
}
