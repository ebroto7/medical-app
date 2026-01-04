"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NutritionEntryForm } from "@/components/nutrition/NutritionEntryForm";
import { TrainingEntryForm } from "@/components/training/TrainingEntryForm";
import { Utensils, Dumbbell } from "lucide-react";

interface CreateEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultTab?: "meal" | "training";
  defaultDate?: Date;
}

export function CreateEntryDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultTab = "meal",
  defaultDate,
}: CreateEntryDialogProps) {
  const [activeTab, setActiveTab] = useState<"meal" | "training">(defaultTab);

  // Reset to default tab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl sm:text-2xl">Nueva Entrada</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "meal" | "training")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="meal" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Comida
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Entreno
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meal" className="mt-0">
            <NutritionEntryForm onSuccess={handleSuccess} defaultDate={defaultDate} />
          </TabsContent>

          <TabsContent value="training" className="mt-0">
            <TrainingEntryForm onSuccess={handleSuccess} defaultDate={defaultDate} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
