/**
 * Supabase Middleware Client
 * Handles session refresh and route protection
 * Based on official Supabase SSR documentation
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // First update the request cookies
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Create new response with updated request
          supabaseResponse = NextResponse.next({
            request,
          });
          // Propagate cookies to the response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRITICAL: getUser() refreshes the token if expired
  // This is what was missing in the previous middleware
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Route configuration
  const protectedRoutes = ["/diary", "/dashboard"];
  const authRoutes = ["/auth/login", "/auth/signup"];
  const nutritionistRoutes = ["/dashboard/nutritionist"];
  const patientRoutes = ["/dashboard/patient", "/diary"];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect to login if not authenticated on protected routes
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Check role-based access for protected routes
  if (user && isProtectedRoute) {
    // /dashboard/profile is accessible to all authenticated users
    const isProfileRoute = pathname === "/dashboard/profile";

    if (!isProfileRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role;
      const isNutritionistRoute = nutritionistRoutes.some((route) =>
        pathname.startsWith(route)
      );
      const isPatientRoute = patientRoutes.some((route) =>
        pathname.startsWith(route)
      );

      // Protect nutritionist routes - only nutritionists can access
      if (isNutritionistRoute && userRole !== "nutritionist") {
        return NextResponse.redirect(
          new URL("/dashboard/patient", request.url)
        );
      }

      // Protect patient routes - only patients can access
      if (isPatientRoute && userRole !== "patient") {
        return NextResponse.redirect(
          new URL("/dashboard/nutritionist", request.url)
        );
      }
    }
  }

  // IMPORTANT: Always return supabaseResponse
  // It contains the refreshed cookies that need to be sent to the browser
  return supabaseResponse;
}
