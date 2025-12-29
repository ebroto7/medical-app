"use client";

import { use } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GPXPlanViewer } from "@/components/gpx/GPXPlanViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface GPXPlanPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function GPXPlanPage({ params }: GPXPlanPageProps) {
  const router = useRouter();
  const { id: planId } = use(params);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/patient/gpx-plans")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Planes GPS
        </Button>

        {/* Plan Viewer */}
        <GPXPlanViewer planId={planId} />
      </div>
    </DashboardLayout>
  );
}
