"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PendingRequest {
  id: string;
  nutritionist: {
    id: string;
    email: string;
    fullName: string;
  };
  createdAt: string;
}

interface ConnectedNutritionist {
  id: string;
  fullName: string;
}

export default function PatientNutritionistsPage() {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [connectedNutritionists, setConnectedNutritionists] = useState<ConnectedNutritionist[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pendingRes, connectedRes] = await Promise.all([
          fetch("/api/nutrition/pending-requests"),
          fetch("/api/nutrition/connected-nutritionists"),
        ]);

        const pendingData = await pendingRes.json();
        const connectedData = await connectedRes.json();

        setPendingRequests(pendingData.data || []);
        setConnectedNutritionists(connectedData.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const response = await fetch("/api/nutrition/accept-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        // Refresh connected nutritionists
        const connectedRes = await fetch("/api/nutrition/connected-nutritionists");
        const connectedData = await connectedRes.json();
        setConnectedNutritionists(connectedData.data || []);
      } else if (response.status === 409) {
        const data = await response.json();
        alert(data.error || "Ya tienes un nutricionista vinculado");
      } else {
        alert("Error al aceptar la solicitud");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al aceptar la solicitud");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (nutritionistId: string) => {
    if (!confirm("¿Estás seguro de que deseas desconectarte de este nutricionista?")) return;

    setActionLoading(nutritionistId);
    try {
      const response = await fetch("/api/nutrition/disconnect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: nutritionistId }),
      });

      if (response.ok) {
        setConnectedNutritionists((prev) => prev.filter((n) => n.id !== nutritionistId));
      } else {
        alert("Error al desconectar");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al desconectar");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm("¿Estás seguro de que deseas rechazar esta solicitud?")) return;

    setActionLoading(requestId);
    try {
      const response = await fetch("/api/nutrition/reject-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        alert("Error al rechazar la solicitud");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al rechazar la solicitud");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nutricionistas</h1>
          <p className="text-gray-600 mt-2">Gestiona solicitudes de nutricionistas</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : null}

        {/* Connected Nutritionists Section */}
        {!loading && connectedNutritionists.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Nutricionistas Conectados</h2>
            {connectedNutritionists.map((nutritionist) => (
              <Card key={nutritionist.id}>
                <CardContent className="py-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{nutritionist.fullName}</p>
                    </div>
                    <Button
                      onClick={() => handleDisconnect(nutritionist.id)}
                      disabled={actionLoading === nutritionist.id}
                      variant="destructive"
                    >
                      {actionLoading === nutritionist.id ? "Desconectando..." : "Desconectar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pending Requests Section */}
        {!loading && pendingRequests.length === 0 && connectedNutritionists.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No tienes solicitudes pendientes ni nutricionistas conectados
            </CardContent>
          </Card>
        ) : !loading && pendingRequests.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Solicitudes Pendientes</h2>
            {pendingRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="py-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.nutritionist.fullName || request.nutritionist.email || "Nuevo nutricionista"}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Solicitud recibida: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAccept(request.id)}
                        disabled={actionLoading === request.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === request.id ? "Procesando..." : "Aceptar"}
                      </Button>
                      <Button
                        onClick={() => handleReject(request.id)}
                        disabled={actionLoading === request.id}
                        variant="outline"
                      >
                        {actionLoading === request.id ? "Procesando..." : "Rechazar"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
