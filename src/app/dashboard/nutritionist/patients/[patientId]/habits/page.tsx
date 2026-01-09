"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HabitsList, CreateHabitDialog, HabitHeatmap, type Habit } from "@/components/habits";
import { Plus, Target, LayoutGrid, Calendar as CalendarIcon, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HabitFormData {
  name: string;
  icon: string;
  color: string;
  is_private: boolean;
}

export default function PatientHabitsPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;
  
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [heatmapMonth, setHeatmapMonth] = useState(new Date());
  const { toast } = useToast();

  const fetchHabits = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const dateStr = selectedDate.toISOString().split("T")[0];
      const monthStr = heatmapMonth.toISOString().slice(0, 7); // YYYY-MM
      // Call with userId to get patient's habits
      const res = await fetch(`/api/habits?userId=${patientId}&date=${dateStr}&month=${monthStr}`);
      if (!res.ok) throw new Error("Failed to fetch habits");
      const { data } = await res.json();
      setHabits(data || []);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los hábitos del paciente",
        variant: "destructive",
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast, patientId, selectedDate, heatmapMonth]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleToggle = async (habitId: string, completed: boolean, date?: string) => {
    const dateStr = date || selectedDate.toISOString().split("T")[0];
    try {
      // Nutritionists can also log/comment for patients
      if (completed) {
        await fetch(`/api/habits/${habitId}/log`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: dateStr })
        });
      } else {
        await fetch(`/api/habits/${habitId}/log?date=${dateStr}`, { method: "DELETE" });
      }
      await fetchHabits(true);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el hábito",
        variant: "destructive",
      });
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
      toast({ title: "Comentario enviado al paciente" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo guardar el comentario",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async (data: HabitFormData) => {
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...data,
            targetUserId: patientId // Explicitly set patient as target
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      toast({ title: "Hábito asignado al paciente" });
      await fetchHabits();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo asignar el hábito",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (data: HabitFormData) => {
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

  return (
    <DashboardLayout role="nutritionist">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Hábitos del Paciente
            </h1>
            <p className="text-sm text-muted-foreground">Gestiona y supervisa las rutinas de tu paciente</p>
          </div>
        </div>

        <Tabs defaultValue="today" className="space-y-6">
          <div className="flex items-center justify-between gap-4">
             <TabsList>
                <TabsTrigger value="today" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Diario
                </TabsTrigger>
                <TabsTrigger value="month" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Mensual
                </TabsTrigger>
              </TabsList>
              
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Asignar Hábito
              </Button>
          </div>

          <TabsContent value="today" className="space-y-6 mt-0">
             <Card className="p-6 bg-card/80 backdrop-blur-sm">
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
                       <div className="text-center min-w-[200px]">
                         <p className="font-semibold capitalize">
                           {selectedDate.toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long' })}
                         </p>
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
                      readOnly={true}
                      dateLabel={selectedDate.toLocaleDateString("es-ES", { day: 'numeric', month: 'short' })}
                    />
                )}
             </Card>
          </TabsContent>

          <TabsContent value="month" className="mt-0">
             <Card className="p-6 bg-card/80 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg">Mapa de Calor</h3>
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
                    readOnly={true}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No hay hábitos asignados</p>
                )}
             </Card>
          </TabsContent>
        </Tabs>

        <CreateHabitDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={editingHabit ? handleEdit : handleCreate}
          editingHabit={editingHabit}
          hidePrivacy={true}
        />
      </div>
    </DashboardLayout>
  );
}
