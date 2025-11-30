"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Request {
  id: string;
  status: string;
  created_at: string;
  patient_id: string;
  patient?: { id: string; full_name: string };
}

export default function PendingRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch("/api/nutrition/connection-requests");
        const data = await response.json();
        setRequests(data.data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Solicitudes Pendientes</h1>
          <p className="text-gray-600 mt-2">Tus solicitudes de acceso a pacientes</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
            No hay solicitudes pendientes
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{req.patient?.full_name || "Sin nombre"}</p>
                    <p className="text-sm text-gray-500">Enviada: {new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-medium text-yellow-700 bg-yellow-50 px-3 py-1 rounded">
                    Pendiente
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
