"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NutritionistDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the consolidated "Mis Pacientes" page
    router.push("/dashboard/nutritionist/patients");
  }, [router]);

  return null;
}
