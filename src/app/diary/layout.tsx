/**
 * Diary Layout with Server-Side Auth Guard
 * Ensures user is a patient before rendering diary pages
 */

import { requirePageRole } from "@/lib/auth/page-auth";

export default async function DiaryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Only patients can access diary - redirects to nutritionist dashboard if wrong role
    await requirePageRole(["patient"]);

    return <>{children}</>;
}
