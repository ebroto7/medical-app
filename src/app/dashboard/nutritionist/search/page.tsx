"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SearchPatients() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "warning">("success");

  const handleSearch = async () => {
    if (!email) {
      setMessage("Por favor ingresa un email");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/nutrition/request-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientEmail: email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.patientHasNutritionist) {
          setMessage(data.error || "El paciente ya está vinculado con otro nutricionista");
          setMessageType("warning");
        } else {
          setMessage(data.error || "Error al enviar solicitud");
          setMessageType("error");
        }
      } else {
        setMessage("Solicitud enviada exitosamente");
        setMessageType("success");
        setEmail("");
      }
    } catch (error) {
      setMessage("Error al enviar solicitud");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Buscar Pacientes</h1>
          <p className="text-gray-600 mt-2">Ingresa el email del paciente para solicitar acceso</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email del Paciente</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="paciente@example.com"
                className="mt-1"
              />
            </div>

            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? "Buscando..." : "Buscar"}
            </Button>

            {message && (
              <div
                className={`p-3 rounded ${
                  messageType === "success"
                    ? "bg-green-50 text-green-700"
                    : messageType === "warning"
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
