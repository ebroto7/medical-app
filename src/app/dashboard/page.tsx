/**
 * Dashboard Redirect Page
 * Server Component that redirects to role-specific dashboard
 */

import { redirect } from "next/navigation";
import { getPageAuthWithRole } from "@/lib/auth/page-auth";

export default async function DashboardPage() {
  const auth = await getPageAuthWithRole();

  if (!auth) {
    redirect("/auth/login");
  }

  // Redirect based on role
  if (auth.role === "nutritionist") {
    redirect("/dashboard/nutritionist");
  }

  redirect("/dashboard/patient");
}
