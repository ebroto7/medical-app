"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createBrowserClient } from "@supabase/ssr";

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        // Create Supabase client
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Query the profile from the client
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          router.push("/dashboard/patient");
          return;
        }

        const userRole = data?.role || "patient";
        console.log("=== DASHBOARD REDIRECT DEBUG ===");
        console.log("User ID:", user.id);
        console.log("User role from DB:", userRole);
        console.log("Data from Supabase:", data);

        // Redirect based on role
        if (userRole === "nutritionist") {
          console.log("Redirecting to nutritionist dashboard");
          router.push("/dashboard/nutritionist");
        } else {
          console.log("Redirecting to patient dashboard");
          router.push("/dashboard/patient");
        }
      } catch (error) {
        console.error("Error in fetchUserRole:", error);
        // Default to patient
        router.push("/dashboard/patient");
      }
    };

    if (!isLoading && user) {
      fetchUserRole();
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando dashboard...</p>
      </div>
    </div>
  );
}
