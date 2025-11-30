"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function AccessDenied() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-red-100 rounded-full">
            <Lock className="text-red-600" size={40} />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Acceso Restringido</h1>
        <p className="text-xl text-gray-600 mb-4">403</p>

        <p className="text-gray-600 mb-8">
          No tienes permiso para acceder a esta página. Si crees que debería tener acceso,
          por favor contacta con el administrador.
        </p>

        <div className="space-y-3">
          <Button onClick={() => router.back()} className="w-full">
            Volver Atrás
          </Button>
          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full">
              Ir al Dashboard
            </Button>
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          Código de error:{" "}
          <span className="font-mono bg-gray-200 px-2 py-1 rounded">403</span>
        </p>
      </div>
    </div>
  );
}
