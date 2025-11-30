"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Menu, X, BookOpen, Users, Settings, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  role?: string | null;
}

export function Sidebar({ role }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getMenuItems = () => {
    if (role === "nutritionist") {
      return [
        { label: "Buscar Pacientes", icon: Search, href: "/dashboard/nutritionist/search" },
        { label: "Solicitudes Pendientes", icon: Users, href: "/dashboard/nutritionist/requests" },
        { label: "Mis Pacientes", icon: BookOpen, href: "/dashboard/nutritionist/patients" },
        { label: "Perfil", icon: Settings, href: "/dashboard/profile" },
      ];
    } else {
      return [
        { label: "Mi Diario", icon: BookOpen, href: "/dashboard/patient" },
        { label: "Nutricionistas", icon: Users, href: "/dashboard/patient/nutritionists" },
        { label: "Perfil", icon: Settings, href: "/dashboard/profile" },
      ];
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    await signOut();
    router.push("/auth/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 md:w-64"
        } md:static md:translate-x-0`}
      >
        <div className="flex flex-col h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold text-gray-900">MedApp</h1>
            {isMobile && (
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Menu */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    if (isMobile) setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start gap-3"
          >
            <LogOut size={20} />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg z-40 md:hidden"
        >
          <Menu size={24} />
        </button>
      )}
    </>
  );
}
