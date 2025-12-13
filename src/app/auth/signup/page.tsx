"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"patient" | "nutritionist">("patient");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Client-side validation
    if (!email || !password || !confirmPassword || !fullName || !role) {
      setError("Por favor completa todos los campos");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor ingresa un email válido");
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password, fullName, role);
      setSuccess("Cuenta creada exitosamente. Por favor inicia sesión para continuar.");
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err: unknown) {
      // Extract error message from backend or use generic message
      const errorMessage = err instanceof Error ? err.message : "Error al crear la cuenta";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Crear Cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-success/10 border border-success/20 text-success rounded">
                  {success}
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Nombre Completo</label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">¿Cuál es tu rol?</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-primary/5">
                    <input
                      type="radio"
                      name="role"
                      value="patient"
                      checked={role === "patient"}
                      onChange={(e) => setRole(e.target.value as "patient" | "nutritionist")}
                      className="w-4 h-4 accent-primary"
                    />
                    <div>
                      <span className="font-medium block">Soy Paciente</span>
                      <span className="text-xs text-muted-foreground">Registra tu diario nutricional</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-primary/5">
                    <input
                      type="radio"
                      name="role"
                      value="nutritionist"
                      checked={role === "nutritionist"}
                      onChange={(e) => setRole(e.target.value as "patient" | "nutritionist")}
                      className="w-4 h-4 accent-primary"
                    />
                    <div>
                      <span className="font-medium block">Soy Nutricionista</span>
                      <span className="text-xs text-muted-foreground">Atiende a tus pacientes</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Contraseña</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Confirmar Contraseña</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                  required
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
              </Button>



              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/login")}
                  className="text-primary hover:underline"
                >
                  Inicia sesión aquí
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push("/")}
        >
          Volver a Inicio
        </Button>
      </div>
    </div>
  );
}
