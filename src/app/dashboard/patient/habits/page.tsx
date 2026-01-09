"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HabitsList, CreateHabitDialog, HabitCalendar, HabitHeatmap, type Habit } from "@/components/habits";
import { Plus, Target, LayoutGrid, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HABIT_COLORS, HabitColor, DEFAULT_HABIT_COLOR } from "@/lib/constants/habits";
import { cn } from "@/lib/utils";

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [heatmapMonth, setHeatmapMonth] = useState(new Date());
  const { toast } = useToast();

  const fetchHabits = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const dateStr = selectedDate.toISOString().split("T")[0];
      const monthStr = heatmapMonth.toISOString().slice(0, 7); // YYYY-MM
      const res = await fetch(`/api/habits?date=${dateStr}&month=${monthStr}`);
      if (!res.ok) throw new Error("Failed to fetch habits");
      const { data } = await res.json();
      setHabits(data || []);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los hábitos",
        variant: "destructive",
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast, selectedDate, heatmapMonth]);

  // Auto-select first habit for calendar if none selected or if previously selected habit is gone
  useEffect(() => {
    if (!selectedHabit && habits.length > 0) {
      setSelectedHabit(habits[0]);
    }
  }, [habits, selectedHabit]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleToggle = async (habitId: string, completed: boolean, date?: string) => {
    const dateStr = date || selectedDate.toISOString().split("T")[0];
    try {
      if (completed) {
        await fetch(`/api/habits/${habitId}/log`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: dateStr })
        });
      } else {
        await fetch(`/api/habits/${habitId}/log?date=${dateStr}`, { method: "DELETE" });
      }
      // Refresh habits silently to avoid flicker
      await fetchHabits(true);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el hábito",
        variant: "destructive",
      });
      throw error; // Re-throw for optimistic update rollback
    }
  };

  const handleComment = async (habitId: string, comment: string, date?: string) => {
    const dateStr = date || selectedDate.toISOString().split("T")[0];
    try {
      await fetch(`/api/habits/${habitId}/log`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, comment })
      });
      await fetchHabits(true);
      toast({ title: "Comentario guardado" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo guardar el comentario",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async (data: { name: string; icon: string; color: string; is_private: boolean }) => {
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      toast({ title: "Hábito creado" });
      await fetchHabits();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo crear el hábito",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (data: { name: string; icon: string; color: string; is_private: boolean }) => {
    if (!editingHabit) return;
    try {
      const res = await fetch(`/api/habits/${editingHabit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({ title: "Hábito actualizado" });
      setEditingHabit(null);
      await fetchHabits();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el hábito",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (habitId: string) => {
    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Hábito eliminado" });
      if (selectedHabit?.id === habitId) {
        setSelectedHabit(null);
      }
      await fetchHabits();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el hábito",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (habit: Habit) => {
    setEditingHabit(habit);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingHabit(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Tabs defaultValue="today" className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
                <Target className="h-8 w-8 text-primary" />
                Mis Hábitos
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Construye mejores rutinas día a día
              </p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <TabsList className="grid w-full sm:w-auto grid-cols-2">
                <TabsTrigger value="today" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Hoy</span>
                </TabsTrigger>
                <TabsTrigger value="month" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Mensual</span>
                </TabsTrigger>
              </TabsList>
              
              <Button onClick={() => setDialogOpen(true)} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo hábito</span>
              </Button>
            </div>
          </div>

          <TabsContent value="today" className="space-y-6 mt-0">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Habits List - Main area */}
              <div className="lg:col-span-2">
                <Card className="p-4 sm:p-6 bg-card/80 backdrop-blur-sm">
                  {/* Date Navigation */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                       <Button 
                         variant="ghost" 
                         size="icon"
                         onClick={() => {
                           const d = new Date(selectedDate);
                           d.setDate(d.getDate() - 1);
                           setSelectedDate(d);
                         }}
                       >
                         ←
                       </Button>
                       <div className="text-center min-w-[140px]">
                         <p className="font-semibold capitalize">
                           {selectedDate.toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long' })}
                         </p>
                         {selectedDate.toDateString() === new Date().toDateString() && (
                           <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Hoy</p>
                         )}
                       </div>
                       <Button 
                         variant="ghost" 
                         size="icon"
                         onClick={() => {
                           const d = new Date(selectedDate);
                           d.setDate(d.getDate() + 1);
                           setSelectedDate(d);
                         }}
                       >
                         →
                       </Button>
                    </div>
                    
                    {selectedDate.toDateString() !== new Date().toDateString() && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedDate(new Date())}
                        className="text-xs h-8"
                      >
                        Volver a Hoy
                      </Button>
                    )}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
                    </div>
                  ) : (
                    <HabitsList
                      habits={habits}
                      onToggle={handleToggle}
                      onComment={handleComment}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                      dateLabel={selectedDate.toDateString() === new Date().toDateString() ? "Hoy" : selectedDate.toLocaleDateString("es-ES", { day: 'numeric', month: 'short' })}
                    />
                  )}
                </Card>
              </div>

              {/* Calendar - Sidebar */}
              <div className="lg:col-span-1">
                <Card className="p-4 sm:p-6 bg-card/80 backdrop-blur-sm">
                  <h3 className="font-semibold mb-4">Calendario</h3>

                  {habits.length > 0 ? (
                    <>
                      {/* Habit selector for calendar */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {habits.map((habit) => {
                          const colorConfig = HABIT_COLORS[habit.color as HabitColor] || HABIT_COLORS[DEFAULT_HABIT_COLOR];
                          const isSelected = selectedHabit?.id === habit.id;
                          
                          return (
                            <button
                              key={habit.id}
                              onClick={() => setSelectedHabit(habit)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-2",
                                isSelected
                                  ? cn(colorConfig.bg, "text-white")
                                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
                              )}
                            >
                              <span>{habit.icon}</span>
                              {isSelected && <span>{habit.name}</span>}
                            </button>
                          );
                        })}
                      </div>

                      {selectedHabit && (
                        <HabitCalendar
                          completedDates={selectedHabit.logsThisMonth.map((l) => l.completed_at)}
                          selectedMonth={calendarMonth}
                          onMonthChange={setCalendarMonth}
                          color={selectedHabit.color}
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Crea un hábito para ver tu progreso
                    </p>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="month" className="mt-0">
            <Card className="p-4 sm:p-6 bg-card/80 backdrop-blur-sm overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold">Progreso Mensual</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Mapa de calor de tus rutinas</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      const d = new Date(heatmapMonth);
                      d.setMonth(d.getMonth() - 1);
                      setHeatmapMonth(d);
                    }}
                  >
                    ←
                  </Button>
                  <span className="text-sm font-medium capitalize min-w-[120px] text-center">
                    {heatmapMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      const d = new Date(heatmapMonth);
                      d.setMonth(d.getMonth() + 1);
                      setHeatmapMonth(d);
                    }}
                  >
                    →
                  </Button>
                </div>
               </div>

               {habits.length > 0 ? (
                  <HabitHeatmap 
                    habits={habits}
                    currentDate={heatmapMonth}
                    onToggle={handleToggle}
                  />
               ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    Crea hábitos para ver tu mapa de progreso
                  </p>
               )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* FAB - Mobile Only */}
        <button
          onClick={() => setDialogOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center md:hidden"
          aria-label="Nuevo hábito"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Create/Edit Dialog */}
        <CreateHabitDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          onSubmit={editingHabit ? handleEdit : handleCreate}
          editingHabit={editingHabit}
        />
      </div>
    </DashboardLayout>
  );
}
