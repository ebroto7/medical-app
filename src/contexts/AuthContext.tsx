"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import type { User } from "@supabase/supabase-js";

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

  useEffect(() => {
    // Check current session and fetch role
    const checkAuth = async () => {
      try {
        // Graceful timeout - resolves with null instead of throwing error
        // If timeout occurs, clears potentially stale/corrupted session cookies
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => {
            console.warn("Auth timeout - clearing potentially stale session");
            supabase.auth.signOut().catch(() => {}); // Clear corrupted cookies
            resolve({ data: { session: null } });
          }, 10000)
        );

        const sessionPromise = supabase.auth.getSession();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionResult: any = await Promise.race([
          sessionPromise,
          timeoutPromise,
        ]);

        const session = sessionResult?.data?.session;

        setUser(session?.user || null);
        setToken(session?.access_token || null);

        // Fetch user role from profiles table with timeout
        if (session?.user) {
          try {
            const roleTimeout = new Promise((resolve) =>
              setTimeout(() => {
                console.warn("Role fetch timeout - continuing without role");
                resolve({ data: null });
              }, 8000)
            );

            const profilePromise = supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profileResult: any = await Promise.race([
              profilePromise,
              roleTimeout,
            ]);

            const profile = profileResult.data;

            setRole(profile?.role || null);
          } catch (roleError) {
            console.warn("Could not fetch role:", roleError);
            setRole(null);
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Try to clear potentially corrupted session
        supabase.auth.signOut().catch(() => {});
        setUser(null);
        setToken(null);
        setRole(null);
      } finally {
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
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
