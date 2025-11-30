"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-blue-100 rounded-full">
            <LogIn className="text-blue-600" size={40} />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Autenticación Requerida</h1>
        <p className="text-xl text-gray-600 mb-4">401</p>

        <p className="text-gray-600 mb-8">
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

        <Link href="/" className="text-sm text-blue-600 hover:underline block mt-6">
          Volver a Inicio
        </Link>
      </div>
    </div>
  );
}
