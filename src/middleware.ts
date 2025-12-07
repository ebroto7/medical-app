import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes that require authentication
  const protectedRoutes = ["/diary", "/dashboard"];
  const authRoutes = ["/auth/login", "/auth/signup"];

  // Nutritionist-only routes
  const nutritionistRoutes = ["/dashboard/nutritionist"];

  // Patient-only routes (includes /diary for backward compatibility)
  const patientRoutes = ["/dashboard/patient", "/diary"];

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if route is auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Check if route requires specific role
  const isNutritionistRoute = nutritionistRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isPatientRoute = patientRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Create Supabase client for server-side auth check
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get user session with timeout
  let user = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    clearTimeout(timeout);
    user = authUser;
  } catch (error) {
    console.error("Error getting user in middleware:", error);
    // Continue without user - will redirect to login if needed
  }

  // If trying to access protected route without auth, redirect to login
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // If user is authenticated, check role-based access
  if (user && isProtectedRoute) {
    // /dashboard/profile is accessible to all authenticated users
    const isProfileRoute = pathname === "/dashboard/profile";

    if (!isProfileRoute) {
      try {
        // Fetch user's role from profiles table with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        clearTimeout(timeout);

        if (error || !profile) {
          console.warn("Could not fetch user profile:", error?.message);
          // Allow access but default to patient dashboard
          const defaultRoute = "/dashboard/patient";
          if (pathname !== defaultRoute) {
            return NextResponse.redirect(new URL(defaultRoute, request.url));
          }
          return response;
        }

        const userRole = profile.role;

        // Protect nutritionist routes - only nutritionists can access
        if (isNutritionistRoute && userRole !== "nutritionist") {
          return NextResponse.redirect(new URL("/dashboard/patient", request.url));
        }

        // Protect patient routes - only patients can access
        if (isPatientRoute && userRole !== "patient") {
          return NextResponse.redirect(new URL("/dashboard/nutritionist", request.url));
        }
      } catch (error) {
        console.error("Error checking user role in middleware:", error);
        // Default to patient dashboard on error instead of redirecting to login
        const defaultRoute = "/dashboard/patient";
        if (pathname !== defaultRoute) {
          return NextResponse.redirect(new URL(defaultRoute, request.url));
        }
        return response;
      }
    }
  }

  // If trying to access auth routes while logged in, redirect to dashboard
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
