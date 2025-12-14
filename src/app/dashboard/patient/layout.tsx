/**
 * Patient Dashboard Layout with Server-Side Auth Guard
 * Ensures user is a patient before rendering
 */

import { requirePageRole } from "@/lib/auth/page-auth";

export default async function PatientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Only patients can access - redirects to nutritionist dashboard if wrong role
    await requirePageRole(["patient"]);

    return <>{children}</>;
}
