/**
 * Dashboard Layout with Server-Side Auth Guard
 * Ensures user is authenticated before rendering any dashboard page
 */

import { requirePageAuth } from "@/lib/auth/page-auth";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This will redirect to /auth/login if not authenticated
    await requirePageAuth();

    return <>{children}</>;
}
