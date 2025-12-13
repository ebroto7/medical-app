"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-primary/10 rounded-full">
            <LogIn className="text-primary" size={40} />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-foreground mb-2">Autenticación Requerida</h1>
        <p className="text-xl text-muted-foreground mb-4">401</p>

        <p className="text-muted-foreground mb-8">
          Necesitas iniciar sesión para acceder a esta página. Por favor, inicia sesión
          con tu cuenta o crea una nueva si no tienes una.
        </p>

        <div className="space-y-3">
          <Link href="/auth/login" className="block">
            <Button className="w-full">Iniciar Sesión</Button>
          </Link>
          <Link href="/auth/signup" className="block">
            <Button variant="outline" className="w-full">
              Crear Cuenta
            </Button>
          </Link>
        </div>

        <Link href="/" className="text-sm text-primary hover:underline block mt-6">
          Volver a Inicio
        </Link>
      </div>
    </div>
  );
}
