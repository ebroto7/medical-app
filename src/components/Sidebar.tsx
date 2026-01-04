"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, BookOpen, Users, Settings, LogOut, Bell, ClipboardList, Plus, Library, Route, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { IconBadge } from "@/components/ui/icon-badge";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarProps {
  role?: string | null;
}

export const Sidebar = React.memo(function Sidebar({ role }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { signOut, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Helper: Determinar si el usuario es paciente
  const isPatient = () => {
    // Comparación case-insensitive para role
    if (role?.toLowerCase() === 'patient') return true;

    // Fallback: Si está en ruta /dashboard/patient/*, asumimos que es patient
    // (el middleware ya validó su rol para permitir acceso)
    if (pathname?.startsWith('/dashboard/patient')) return true;

    return false;
  };

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

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!token) return;
      try {
        const res = await fetch("/api/notifications?unread=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { data } = await res.json();
          setUnreadCount(data?.length || 0);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchUnreadCount();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const getMenuItems = () => {
    if (role === "nutritionist") {
      return [
        { label: "Mis Pacientes", icon: Users, href: "/dashboard/nutritionist/patients", color: "blue" as const },
        { label: "Notificaciones", icon: Bell, href: "/dashboard/notifications", badge: unreadCount, color: "orange" as const },
        { label: "Perfil", icon: Settings, href: "/dashboard/profile", color: "muted" as const },
      ];
    } else {
      return [
        { label: "Mis Hábitos", icon: Target, href: "/dashboard/patient/habits", color: "rose" as const },
        { label: "Mi Diario", icon: BookOpen, href: "/dashboard/patient", color: "green" as const },
        { label: "Biblioteca de menús", icon: Library, href: "/dashboard/patient/saved-meals", color: "yellow" as const },
        { label: "Mis Pautas", icon: ClipboardList, href: "/dashboard/patient/meal-plans", color: "purple" as const },
        { label: "Planes GPS", icon: Route, href: "/dashboard/patient/gpx-plans", color: "primary" as const },
        { label: "Nutricionistas", icon: Users, href: "/dashboard/patient/nutritionists", color: "blue" as const },
        { label: "Notificaciones", icon: Bell, href: "/dashboard/notifications", badge: unreadCount, color: "orange" as const },
        { label: "Perfil", icon: Settings, href: "/dashboard/profile", color: "muted" as const },
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
        className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-50 transition-transform duration-300 ${isOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 md:w-64"
          } md:sticky md:translate-x-0 shadow-lg`}
      >
        <div className="flex flex-col h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-sidebar-border">
            <Link href="/" className="flex items-center gap-3 group">
              <Logo size="md" className="group-hover:text-sidebar-primary transition-colors" />
              <span className="text-xl font-logo text-sidebar-foreground hidden sm:inline group-hover:text-sidebar-primary transition-colors">NutriDiary</span>
            </Link>
            {isMobile && (
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-sidebar-accent rounded-lg transition-colors text-sidebar-accent-foreground"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Menu */}
          <nav className="flex-1 space-y-1">
            {/* Nueva Entrada Button - Patient Only */}
            {isPatient() && (
              <Button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('openCreateEntryDialog', {
                      detail: { defaultTab: 'meal' }
                    })
                  );
                  if (isMobile) setIsOpen(false);
                }}
                className="w-full mb-4 gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 shadow-md font-medium"
              >
                <Plus className="h-5 w-5" />
                Nueva Entrada
              </Button>
            )}

            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    if (isMobile) setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl transition-all duration-200 active:scale-[0.98] group"
                >
                  <div className="relative flex-shrink-0">
                    <IconBadge icon={Icon} color={item.color} size="sm" />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-bold bg-accent-red text-white rounded-full shadow-sm">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-left">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout & Theme */}
          <div className="space-y-2 mt-auto">
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-sm text-sidebar-foreground/60 font-medium">Tema</span>
              <ThemeToggle />
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start gap-3 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut size={20} />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 p-3 bg-sidebar-primary text-sidebar-primary-foreground rounded-full shadow-lg z-40 md:hidden hover:scale-105 transition-all duration-200"
        >
          <Menu size={24} />
        </button>
      )}
    </>
  );
});
