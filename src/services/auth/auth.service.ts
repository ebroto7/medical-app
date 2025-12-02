/**
 * AuthService
 * Single Responsibility: Encapsulate authentication logic
 *
 * IMPORTANT: We do NOT modify the Supabase auth flow.
 * We rely on onAuthStateChange() which Supabase guarantees will be called
 * after session is properly set up (with cookies written).
 */

import { createClient as createBrowserClient } from "@/utils/supabase/client";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { AuthenticationError, ValidationError } from "@/lib/auth/errors";
import type { AuthUser, SignInResponse, SignUpResponse } from "./types";
import { UserRole } from "@/lib/auth/constants";

class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Sign up a new user
   * Creates both auth user and profile in single atomic operation
   * @throws ValidationError if input is invalid
   * @throws AuthenticationError if signup fails
   */
  async signUp(
    email: string,
    password: string,
    fullName: string,
    role: string
  ): Promise<SignUpResponse> {
    // Validate inputs
    if (!email || !password || !fullName || !role) {
      throw new ValidationError("Missing required fields");
    }

    if (password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters");
    }

    if (!["patient", "nutritionist"].includes(role)) {
      throw new ValidationError("Invalid role");
    }

    try {
      const supabase = await createServerClient();

      // Use admin client to create user with service role
      const { data, error: signUpError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
          user_metadata: {
            full_name: fullName,
          },
        });

      if (signUpError || !data.user) {
        throw new AuthenticationError(
          signUpError?.message || "Failed to create user"
        );
      }

      // Create profile record
      try {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            email,
            full_name: fullName,
            role,
          });

        if (profileError) {
          // Rollback: delete the user if profile creation fails
          await supabase.auth.admin.deleteUser(data.user.id);
          throw new AuthenticationError("Failed to create user profile");
        }
      } catch (error) {
        // Cleanup on profile creation error
        await supabase.auth.admin.deleteUser(data.user.id);
        throw error;
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email || "",
        },
        profile: {
          id: data.user.id,
          email: data.user.email || "",
          full_name: fullName,
          role: role as UserRole,
        },
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError("Signup failed");
    }
  }

  /**
   * Sign in user
   * Uses Supabase auth flow directly - onAuthStateChange will handle role fetching
   */
  async signIn(email: string, password: string): Promise<SignInResponse> {
    if (!email || !password) {
      throw new AuthenticationError("Email and password required");
    }

    try {
      const supabase = createBrowserClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        throw new AuthenticationError(
          error?.message || "Invalid credentials"
        );
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email || "",
        },
        role: null, // Role will be fetched by onAuthStateChange listener in AuthContext
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError("Sign in failed");
    }
  }

  /**
   * Get current authenticated user
   * SSR-safe: Uses server client
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email || "",
      };
    } catch (error) {
      console.error("[AuthService] Error getting current user:", error);
      return null;
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new AuthenticationError(error.message);
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError("Sign out failed");
    }
  }
}

export default AuthService.getInstance();
