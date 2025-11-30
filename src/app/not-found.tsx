import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-900 mb-2">404</h1>
          <p className="text-2xl font-semibold text-gray-900">Página no encontrada</p>
        </div>

        <p className="text-gray-600 mb-8">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>

        <div className="space-y-3">
          <Link href="/" className="block">
            <Button className="w-full">Ir a Inicio</Button>
          </Link>
          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full">
              Ir al Dashboard
            </Button>
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          Si crees que esto es un error, por favor{" "}
          <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
            contacta con soporte
          </a>
        </p>
      </div>
    </div>
  );
}
