/**
 * Nutritionist Dashboard Page
 * Redirects to patients page (main view for nutritionists)
 */

import { redirect } from "next/navigation";

export default function NutritionistDashboard() {
  redirect("/dashboard/nutritionist/patients");
}
