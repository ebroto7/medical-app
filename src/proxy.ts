/**
 * Next.js 16 Proxy
 * Lightweight request interceptor that only handles session refresh
 * Auth/authorization is handled in Server Components (see lib/auth/page-auth.ts)
 */

import { type NextRequest } from "next/server";
import { refreshSession } from "@/utils/supabase/session";

export default async function proxy(request: NextRequest) {
    // Only refresh session cookies
    // No auth checks here - they happen in Server Components
    return await refreshSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Static assets (svg, png, jpg, jpeg, gif, webp)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
