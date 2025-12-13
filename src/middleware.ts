import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // updateSession handles:
  // 1. Token refresh via getUser()
  // 2. Cookie propagation to browser
  // 3. Route protection (auth check + role-based access)
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (svg, png, jpg, jpeg, gif, webp)
     *
     * IMPORTANT: Unlike before, we now INCLUDE /api/* routes
     * This ensures API calls also get refreshed session cookies
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
