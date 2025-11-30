"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HealthStatus {
  status: string;
  message: string;
  environment?: {
    supabaseUrl: string;
    supabaseKey: string;
  };
  timestamp?: string;
  error?: string;
}

export default function Home() {
  const router = useRouter();
  const { user, isLoading, role, signOut } = useAuth();
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkSupabaseHealth = async () => {
    setIsChecking(true);
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      setHealthStatus(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setHealthStatus({
        status: "error",
        message: "Failed to check health",
        error: errorMessage,
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">NutriDiary</h1>
          <div className="flex gap-4 items-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={checkSupabaseHealth}
              disabled={isChecking}
              title="Test Supabase connection"
              className="text-xs"
            >
              {isChecking ? "Probando..." : "🔌 Test"}
            </Button>
            {isLoading ? (
              <div>Cargando...</div>
            ) : user ? (
              <>
                <Button onClick={() => router.push("/dashboard")}>
                  Mi Espacio
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await signOut();
                    router.push("/");
                  }}
                >
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push("/auth/login")}
                >
                  Iniciar Sesión
                </Button>
                <Button onClick={() => router.push("/auth/signup")}>
                  Registrarse
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-16">
        {healthStatus && (
          <section className={`mb-8 p-4 rounded-lg border ${
            healthStatus.status === "ok"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}>
            <div className={`text-sm font-mono ${
              healthStatus.status === "ok"
                ? "text-green-800"
                : "text-red-800"
            }`}>
              <p><strong>Status:</strong> {healthStatus.status}</p>
              <p><strong>Message:</strong> {healthStatus.message}</p>
              {healthStatus.environment && (
                <>
                  <p><strong>Supabase URL:</strong> {healthStatus.environment.supabaseUrl}</p>
                  <p><strong>Supabase Key:</strong> {healthStatus.environment.supabaseKey}</p>
                </>
              )}
              {healthStatus.timestamp && (
                <p><strong>Timestamp:</strong> {healthStatus.timestamp}</p>
              )}
              {healthStatus.error && (
                <p><strong>Error:</strong> {healthStatus.error}</p>
              )}
            </div>
          </section>
        )}

        <section className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Tu Diario Nutricional Digital
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Registra tus comidas con fotos y descripciones. Controla tu nutrición de forma fácil y efectiva.
          </p>
          {!user && (
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => router.push("/auth/signup")}>
                Comenzar Ahora
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/auth/login")}
              >
                Iniciar Sesión
              </Button>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-semibold mb-2">Captura tus Comidas</h3>
            <p className="text-gray-600">
              Sube fotos de lo que comes para llevar un registro visual de tu nutrición.
            </p>
          </div>

          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">Anota Detalles</h3>
            <p className="text-gray-600">
              Describe los ingredientes y cantidad para mantener un registro completo.
            </p>
          </div>

          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">Organiza por Fecha</h3>
            <p className="text-gray-600">
              Visualiza tus comidas organizadas por día y momento (desayuno, comida, etc).
            </p>
          </div>
        </section>

        {user && (
          <section className="text-center p-8 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">
              Bienvenido, {user.email}
            </h3>
            <p className="text-blue-800 mb-6">
              {role === "nutritionist" ?
                "Accede a tu panel para gestionar tus pacientes" :
                "¿Listo para registrar tu próxima comida?"
              }
            </p>
            <Button size="lg" onClick={() => router.push("/dashboard")}>
              {role === "nutritionist" ? "Ir a Mi Panel" : "Ir a Mi Diario"}
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}
