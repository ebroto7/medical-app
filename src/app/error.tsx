"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-yellow-100 rounded-full">
            <AlertCircle className="text-yellow-600" size={40} />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
        <p className="text-lg text-gray-600 mb-4">Hubo un error inesperado</p>

        <div className="bg-gray-100 rounded-lg p-4 mb-8 text-left">
          <p className="text-sm font-mono text-gray-700 break-words">
            {error.message || "Error desconocido"}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 mt-2">
              ID del error: {error.digest}
            </p>
          )}
        </div>

        <p className="text-gray-600 mb-8">
          Nuestro equipo ha sido notificado sobre este problema. Por favor, intenta
          recargar la página o volver más tarde.
        </p>

        <div className="space-y-3">
          <Button onClick={() => reset()} className="w-full">
            Intentar de nuevo
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="w-full"
          >
            Ir a Inicio
          </Button>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          Si el problema persiste, por favor{" "}
          <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
            contacta con soporte
          </a>
        </p>
      </div>
    </div>
  );
}
