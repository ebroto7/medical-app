"use client";

import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const { user, role } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mi Perfil</h1>
          <p className="text-muted-foreground mt-2">Información de tu cuenta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-foreground mt-1">{user?.email || "No disponible"}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Rol</label>
              <p className="text-foreground mt-1 capitalize">
                {role === "nutritionist" ? "Nutricionista" : "Paciente"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">ID de Usuario</label>
              <p className="text-foreground mt-1 text-sm font-mono">{user?.id || "No disponible"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
