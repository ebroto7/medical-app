/**
 * Session Refresh Utility
 * Handles Supabase session cookie refresh for proxy.ts
 * Renamed from middleware.ts following Next.js 16 conventions
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the Supabase session and propagate cookies
 * This ONLY handles token refresh - no auth/role checks
 * Auth checks are now done in Server Components via page-auth.ts
 */
export async function refreshSession(request: NextRequest) {
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
    // This is what keeps sessions alive across requests
    await supabase.auth.getUser();

    // Return response with refreshed cookies
    // No auth checks here - that's now handled by page-auth.ts
    return supabaseResponse;
}
