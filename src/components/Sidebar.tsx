"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X, BookOpen, Users, Settings, LogOut, Bell, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { IconBadge } from "@/components/ui/icon-badge";

interface SidebarProps {
  role?: string | null;
}

export function Sidebar({ role }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { signOut, token } = useAuth();
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
        { label: "Mi Diario", icon: BookOpen, href: "/dashboard/patient", color: "green" as const },
        { label: "Mis Pautas", icon: ClipboardList, href: "/dashboard/patient/meal-plans", color: "purple" as const },
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
        className={`fixed left-0 top-0 h-screen bg-card border-r border-border z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 md:w-64"
        } md:static md:translate-x-0`}
      >
        <div className="flex flex-col h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <Link href="/" className="flex items-center gap-3 group">
              <Logo size="md" className="group-hover:text-primary transition-colors" />
              <span className="text-xl font-logo text-foreground hidden sm:inline group-hover:text-primary transition-colors">NutriDiary</span>
            </Link>
            {isMobile && (
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-accent/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Menu */}
          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    if (isMobile) setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-foreground hover:bg-foreground/10 rounded-xl transition-all duration-200 active:scale-[0.98] group"
                >
                  <div className="relative flex-shrink-0">
                    <IconBadge icon={Icon} color={item.color} size="sm" />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-bold bg-accent-red text-white rounded-full shadow-sm">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </div>
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
          className="fixed bottom-6 right-6 p-3 bg-foreground text-background rounded-full shadow-lg z-40 md:hidden hover:scale-105 transition-all duration-200"
        >
          <Menu size={24} />
        </button>
      )}
    </>
  );
}
