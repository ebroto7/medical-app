"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Plus, Heart, Send, Check } from "lucide-react";

export function ButtonShowcase() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-foreground text-background p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] max-h-[85vh] overflow-auto bg-card border-2 border-foreground rounded-2xl shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b-2 border-foreground p-4 flex items-center justify-between z-10">
        <div>
          <h3 className="font-bold text-lg">Button Showcase</h3>
          <p className="text-xs text-muted-foreground">Estilos actuales aplicados</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Current Styles Applied */}
      <div className="p-4 bg-accent-green/10 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
          <Check className="h-4 w-4" />
          Estilos seleccionados:
        </div>
        <p className="text-xs text-muted-foreground">
          <strong>Primary:</strong> Pill Outline | <strong>Secondary:</strong> Soft
        </p>
      </div>

      {/* Variants Preview */}
      <div className="p-4 space-y-6">

        {/* Default (Primary) - Pill Outline */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">DEFAULT (Primary)</p>
          <p className="text-[10px] text-muted-foreground/70 mb-3">Pill Outline: borde sólido, hover invierte colores</p>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Secondary - Soft */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">SECONDARY</p>
          <p className="text-[10px] text-muted-foreground/70 mb-3">Soft: fondo suave sin bordes</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm">Small</Button>
            <Button variant="secondary">Default</Button>
            <Button variant="secondary" size="lg">Large</Button>
          </div>
        </div>

        {/* Outline */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">OUTLINE</p>
          <p className="text-[10px] text-muted-foreground/70 mb-3">Borde suave, hover rellena</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">Small</Button>
            <Button variant="outline">Default</Button>
            <Button variant="outline" size="lg">Large</Button>
          </div>
        </div>

        {/* Destructive */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">DESTRUCTIVE</p>
          <p className="text-[10px] text-muted-foreground/70 mb-3">Pill Outline en rojo</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="destructive" size="sm">Small</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="destructive" size="lg">Large</Button>
          </div>
        </div>

        {/* Ghost */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">GHOST</p>
          <p className="text-[10px] text-muted-foreground/70 mb-3">Transparente, hover suave</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" size="sm">Small</Button>
            <Button variant="ghost">Default</Button>
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Link */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">LINK</p>
          <p className="text-[10px] text-muted-foreground/70 mb-3">Solo texto, subrayado al hover</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="link" size="sm">Small Link</Button>
            <Button variant="link">Default Link</Button>
          </div>
        </div>

        {/* With Icons */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">CON ICONOS</p>
          <div className="flex flex-wrap gap-3">
            <Button>
              <Send className="h-4 w-4" />
              Enviar
            </Button>
            <Button variant="secondary">
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline">
              <Plus className="h-4 w-4" />
              Añadir
            </Button>
          </div>
        </div>

        {/* All Sizes Comparison */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">COMPARACIÓN DE TAMAÑOS</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground w-12">sm:</span>
              <Button size="sm">Button</Button>
              <Button variant="secondary" size="sm">Button</Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground w-12">default:</span>
              <Button>Button</Button>
              <Button variant="secondary">Button</Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground w-12">lg:</span>
              <Button size="lg">Button</Button>
              <Button variant="secondary" size="lg">Button</Button>
            </div>
          </div>
        </div>

        {/* Real Usage Examples */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">EJEMPLOS DE USO</p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button className="flex-1">Guardar</Button>
              <Button variant="secondary" className="flex-1">Cancelar</Button>
            </div>
            <div className="flex gap-3">
              <Button size="lg" className="flex-1">Comenzar Ahora</Button>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">Más Información</Button>
            </div>
            <div className="flex gap-3">
              <Button variant="destructive">Eliminar Cuenta</Button>
              <Button variant="ghost">Cancelar</Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
