/**
 * Nutritionist Dashboard Layout with Server-Side Auth Guard
 * Ensures user is a nutritionist before rendering
 */

import { requirePageRole } from "@/lib/auth/page-auth";

export default async function NutritionistLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Only nutritionists can access - redirects to patient dashboard if wrong role
    await requirePageRole(["nutritionist"]);

    return <>{children}</>;
}
