"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  token: string | null;
  role: string | null;
  signUp: (email: string, password: string, fullName: string, userRole: "patient" | "nutritionist") => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Global Fail-Safe: Force loading to stop after 4 seconds max
    // This guarantees the UI never gets stuck in infinite loading loop
    const globalSafetyTimer = setTimeout(() => {
      if (isLoading) {
        console.warn("AuthContext: Global safety timer triggered. Forcing loading false.");
        setIsLoading(false);
      }
    }, 4000);

    // Check current session and fetch role
    // Note: Middleware handles token refresh, so we can trust getSession() here
    const checkAuth = async () => {
      // "Safety Valve": Race external auth against a timeout
      // This prevents the app from hanging indefinitely if the browser has a "zombie cookie"
      // or if the Supabase SDK enters a deadlock state.
      const authPromise = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        setUser(session?.user || null);
        setToken(session?.access_token || null);

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          setRole(profile?.role || null);
        } else {
          setRole(null);
        }
      };

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Auth timeout")), 3000) // 3s max wait
      );

      try {
        await Promise.race([authPromise(), timeoutPromise]);
      } catch (error) {
        console.warn("Auth check failed or timed out - verify browser state:", error);

        // Recovery Strategy: If we timed out, the local state is likely corrupted.
        // We force a localized signOut to clear cookies/storage without refreshing.
        if (error instanceof Error && error.message === "Auth timeout") {
          console.log("AuthContext: Timeout detected. Forcing local session cleanup...");
          // Use 'local' scope to prevent hanging on network request during recovery
          await supabase.auth.signOut({ scope: 'local' });
          console.log("AuthContext: Local cleanup done. Resetting state.");
          setUser(null);
          setToken(null);
          setRole(null);
        }
      } finally {
        console.log("AuthContext: Finally block - stopping loader");
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes using onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        setToken(session?.access_token || null);

        // Fetch role when auth state changes
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          setRole(profile?.role || null);
        } else {
          setRole(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
      // Clear safety timer if component unmounts
      clearTimeout(globalSafetyTimer);
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, userRole: "patient" | "nutritionist") => {
    // Call backend endpoint (more secure than direct Supabase call)
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
        role: userRole,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    // Note: User must log in after signup
    // This is more secure and allows for email confirmation in the future
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    try {
      // 1. Call server-side logout to clear HTTP-only cookies
      await fetch('/api/auth/signout', {
        method: 'POST',
      });

      // 2. Also call client-side signout
      await supabase.auth.signOut();

    } catch (error) {
      console.warn("AuthContext: SignOut error:", error);
    } finally {
      // Always clear local state
      setUser(null);
      setToken(null);
      setRole(null);
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, token, role, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
