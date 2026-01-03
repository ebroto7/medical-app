"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Users, Clock, AlertTriangle, Unlink } from "lucide-react";

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
  email?: string;
}

export default function PatientNutritionistsPage() {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [connectedNutritionists, setConnectedNutritionists] = useState<ConnectedNutritionist[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dialog states
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedNutritionist, setSelectedNutritionist] = useState<ConnectedNutritionist | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pendingRes, connectedRes] = await Promise.all([
          fetch("/api/nutrition/pending-requests", { credentials: "include" }),
          fetch("/api/nutrition/connected-nutritionists", { credentials: "include" }),
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

  const handleAccept = useCallback(async (requestId: string) => {
    // Find the request to get nutritionist info for optimistic update
    const request = pendingRequests.find(r => r.id === requestId);
    if (!request) return;

    setActionLoading(requestId);

    // Optimistic update
    const previousPending = pendingRequests;
    const previousConnected = connectedNutritionists;
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    setConnectedNutritionists(prev => [...prev, {
      id: request.nutritionist.id,
      fullName: request.nutritionist.fullName,
      email: request.nutritionist.email,
    }]);

    try {
      const response = await fetch("/api/nutrition/accept-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      if (!response.ok) {
        // Rollback on error
        setPendingRequests(previousPending);
        setConnectedNutritionists(previousConnected);
        if (response.status === 409) {
          const data = await response.json();
          alert(data.error || "Ya tienes un nutricionista vinculado");
        } else {
          alert("Error al aceptar la solicitud");
        }
      }
    } catch (error) {
      // Rollback on error
      setPendingRequests(previousPending);
      setConnectedNutritionists(previousConnected);
      console.error("Error:", error);
      alert("Error al aceptar la solicitud");
    } finally {
      setActionLoading(null);
    }
  }, [pendingRequests, connectedNutritionists]);

  const openDisconnectDialog = useCallback((nutritionist: ConnectedNutritionist) => {
    setSelectedNutritionist(nutritionist);
    setDisconnectDialogOpen(true);
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!selectedNutritionist) return;

    setActionLoading(selectedNutritionist.id);

    // Optimistic update
    const previousConnected = connectedNutritionists;
    setConnectedNutritionists(prev => prev.filter(n => n.id !== selectedNutritionist.id));
    setDisconnectDialogOpen(false);

    try {
      const response = await fetch("/api/nutrition/disconnect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: selectedNutritionist.id }),
      });

      if (!response.ok) {
        // Rollback on error
        setConnectedNutritionists(previousConnected);
        alert("Error al desconectar");
      }
      setSelectedNutritionist(null);
    } catch (error) {
      // Rollback on error
      setConnectedNutritionists(previousConnected);
      console.error("Error:", error);
      alert("Error al desconectar");
    } finally {
      setActionLoading(null);
    }
  }, [selectedNutritionist, connectedNutritionists]);

  const openRejectDialog = useCallback((request: PendingRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  }, []);

  const handleReject = useCallback(async () => {
    if (!selectedRequest) return;

    setActionLoading(selectedRequest.id);

    // Optimistic update
    const previousPending = pendingRequests;
    setPendingRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
    setRejectDialogOpen(false);

    try {
      const response = await fetch("/api/nutrition/reject-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: selectedRequest.id }),
      });

      if (!response.ok) {
        // Rollback on error
        setPendingRequests(previousPending);
        alert("Error al rechazar la solicitud");
      }
      setSelectedRequest(null);
    } catch (error) {
      // Rollback on error
      setPendingRequests(previousPending);
      console.error("Error:", error);
      alert("Error al rechazar la solicitud");
    } finally {
      setActionLoading(null);
    }
  }, [selectedRequest, pendingRequests]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-foreground">Mis Nutricionistas</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tus conexiones con nutricionistas profesionales
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-3">Cargando...</p>
          </div>
        ) : (
          <>
            {/* Connected Nutritionist Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <IconBadge icon={Users} color="blue" size="sm" />
                <h2 className="text-foreground">Nutricionista Conectado</h2>
              </div>

              {connectedNutritionists.length > 0 ? (
                connectedNutritionists.map((nutritionist) => (
                  <Card key={nutritionist.id} className="border-accent-blue/30">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-full bg-accent-blue flex items-center justify-center">
                            <User className="h-7 w-7 text-foreground" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-foreground">
                              {nutritionist.fullName || "Nutricionista"}
                            </p>
                            {nutritionist.email && (
                              <p className="text-sm text-muted-foreground">
                                {nutritionist.email}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="h-2 w-2 rounded-full bg-accent-blue"></div>
                              <span className="text-xs text-muted-foreground">Conectado</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => openDisconnectDialog(nutritionist)}
                          variant="destructive"
                          size="sm"
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          Desconectar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted mb-4">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-medium">Sin nutricionista conectado</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Acepta una solicitud pendiente para conectar con un nutricionista
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Pending Requests Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <IconBadge icon={Clock} color="orange" size="sm" />
                <h2 className="text-foreground">Solicitudes Pendientes</h2>
                {pendingRequests.length > 0 && (
                  <span className="ml-2 px-2.5 py-0.5 rounded-full bg-accent-orange text-foreground text-xs font-bold">
                    {pendingRequests.length}
                  </span>
                )}
              </div>

              {pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-accent-orange flex items-center justify-center">
                              <User className="h-6 w-6 text-foreground" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground">
                                {request.nutritionist.fullName || request.nutritionist.email || "Nuevo nutricionista"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Solicitud recibida el {formatDate(request.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAccept(request.id)}
                              disabled={actionLoading === request.id}
                              size="sm"
                            >
                              {actionLoading === request.id ? "..." : "Aceptar"}
                            </Button>
                            <Button
                              onClick={() => openRejectDialog(request)}
                              disabled={actionLoading === request.id}
                              variant="secondary"
                              size="sm"
                            >
                              Rechazar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-6 text-center text-muted-foreground">
                    No tienes solicitudes pendientes
                  </CardContent>
                </Card>
              )}
            </section>
          </>
        )}
      </div>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-accent-red/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-accent-red" />
              </div>
              <DialogTitle>Confirmar desconexión</DialogTitle>
            </div>
            <DialogDescription className="text-left">
              ¿Estás seguro de que deseas desconectarte de{" "}
              <strong>{selectedNutritionist?.fullName || "este nutricionista"}</strong>?
              <br /><br />
              El nutricionista ya no podrá ver tu diario nutricional ni dejarte comentarios.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="secondary"
              onClick={() => setDisconnectDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={actionLoading === selectedNutritionist?.id}
            >
              {actionLoading === selectedNutritionist?.id ? "Desconectando..." : "Sí, desconectar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Request Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-accent-orange/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-accent-orange" />
              </div>
              <DialogTitle>Rechazar solicitud</DialogTitle>
            </div>
            <DialogDescription className="text-left">
              ¿Estás seguro de que deseas rechazar la solicitud de{" "}
              <strong>
                {selectedRequest?.nutritionist.fullName ||
                 selectedRequest?.nutritionist.email ||
                 "este nutricionista"}
              </strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="secondary"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={actionLoading === selectedRequest?.id}
            >
              {actionLoading === selectedRequest?.id ? "Rechazando..." : "Sí, rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
