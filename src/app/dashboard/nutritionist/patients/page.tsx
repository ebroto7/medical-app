"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Patient {
  connectionId: string;
  patient: { id: string; fullName: string };
  connectedAt: string;
}

export default function MyPatients() {
  const { user } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch("/api/nutrition/my-patients");
        const data = await response.json();
        setPatients(data.data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Pacientes</h1>
          <p className="text-gray-600 mt-2">Pacientes con los que tienes conexión activa</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
            No tienes pacientes conectados aún
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((patient) => (
              <button
                key={patient.connectionId}
                onClick={() => router.push(`/dashboard/nutritionist/patients/${patient.patient.id}`)}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-left"
              >
                <p className="font-medium text-gray-900 text-lg">{patient.patient.fullName}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Conectado: {new Date(patient.connectedAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
