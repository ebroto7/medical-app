"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Patient {
  connectionId: string;
  patient: { id: string; fullName: string };
  connectedAt: string;
}

interface PendingRequest {
  id: string;
  createdAt: string;
  patient?: { id: string; full_name: string };
}

export default function MyPatients() {
  const { user } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [searchMessageType, setSearchMessageType] = useState<"success" | "error" | "warning">("success");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsRes, requestsRes] = await Promise.all([
        fetch("/api/nutrition/my-patients"),
        fetch("/api/nutrition/my-pending-requests"),
      ]);

      const patientsData = await patientsRes.json();
      const requestsData = await requestsRes.json();

      setPatients(patientsData.data || []);
      setPendingRequests(requestsData.data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      setSearchMessage("Por favor ingresa un email");
      setSearchMessageType("error");
      return;
    }

    setSearchLoading(true);
    setSearchMessage("");

    try {
      const response = await fetch("/api/nutrition/request-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientEmail: searchEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.patientHasNutritionist) {
          setSearchMessage(data.error || "El paciente ya está vinculado con otro nutricionista");
          setSearchMessageType("warning");
        } else {
          setSearchMessage(data.error || "Error al enviar solicitud");
          setSearchMessageType("error");
        }
      } else {
        setSearchMessage("Solicitud enviada exitosamente");
        setSearchMessageType("success");
        setSearchEmail("");
        // Refetch requests
        setTimeout(fetchData, 1000);
      }
    } catch (error) {
      setSearchMessage("Error al enviar solicitud");
      setSearchMessageType("error");
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mis Pacientes</h1>
          <p className="text-muted-foreground mt-2">Gestiona tus pacientes, solicitudes y búsqueda de nuevos pacientes</p>
        </div>

        {/* Search New Patient */}
        <Card className="bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Buscar Nuevo Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Email del paciente"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                disabled={searchLoading}
              />
              <Button
                onClick={handleSearch}
                disabled={searchLoading}
              >
                {searchLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            {searchMessage && (
              <div
                className={`p-3 rounded text-sm ${
                  searchMessageType === "success"
                    ? "bg-success/10 text-success"
                    : searchMessageType === "warning"
                    ? "bg-warning/10 text-warning-foreground"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {searchMessage}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Requests */}
        {!loading && pendingRequests.length > 0 && (
          <Card className="bg-card/70 backdrop-blur-sm border-warning/30">
            <CardHeader>
              <CardTitle className="text-xl">Solicitudes Pendientes ({pendingRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex justify-between items-center p-3 bg-warning/10 rounded-lg border border-warning/30"
                  >
                    <div>
                      <p className="font-medium text-foreground">{request.patient?.full_name || "Paciente"}</p>
                      <p className="text-xs text-muted-foreground">
                        Solicitado: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-warning-foreground bg-warning/20 px-2 py-1 rounded">
                      Pendiente
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connected Patients */}
        <Card className="bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Pacientes Conectados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : patients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No tienes pacientes conectados aún</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patients.map((patient) => (
                  <button
                    key={patient.connectionId}
                    onClick={() => router.push(`/dashboard/nutritionist/patients/${patient.patient.id}`)}
                    className="bg-card/70 backdrop-blur-sm rounded-lg shadow-sm p-6 hover:shadow-md hover:bg-card/90 transition-all text-left border border-border"
                  >
                    <p className="font-medium text-foreground text-lg">{patient.patient.fullName}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Conectado: {new Date(patient.connectedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-primary mt-3">Ver diario →</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
