"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Upload, FileUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface GPXUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: (planId: string) => void;
}

export function GPXUploadDialog({ open, onOpenChange, onUploaded }: GPXUploadDialogProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [sportType, setSportType] = useState<string>("running");

  // Helper function to extract clean name from GPX filename
  const extractCleanName = (filename: string): string => {
    // Remove .gpx extension
    let cleanName = filename.replace(/\.gpx$/i, '');

    // Remove common patterns: timestamps, version numbers, hashes
    cleanName = cleanName
      .replace(/^\d{4}_GPX_/i, '') // Remove "2022_GPX_"
      .replace(/_V\d+.*$/i, '') // Remove "_V10_NO_22_c031718b83"
      .replace(/_[a-f0-9]{8,}$/i, '') // Remove trailing hashes
      .replace(/_by_.*$/i, '') // Remove "_by_UTMB"
      .replace(/[_-]+/g, ' ') // Replace underscores/hyphens with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();

    // Capitalize first letter of each word
    cleanName = cleanName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return cleanName || filename.replace(/\.gpx$/i, ''); // Fallback to original if all removed
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validate file extension
      if (!selectedFile.name.toLowerCase().endsWith('.gpx')) {
        setError("Solo se permiten archivos .gpx");
        return;
      }

      // Validate file size (20MB)
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError("El archivo excede el tamaño máximo de 20MB");
        return;
      }

      setFile(selectedFile);

      // Auto-fill name with cleaned version if empty
      if (!name) {
        setName(extractCleanName(selectedFile.name));
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !name.trim()) return;

    setIsUploading(true);
    setError("");

    try {
      // 1. Create plan
      const createRes = await fetch("/api/gpx-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          event_name: eventName || undefined,
          event_date: eventDate || undefined,
          sport_type: sportType,
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.error || "Error al crear el plan");
      }

      const { data: plan } = await createRes.json();

      // 2. Upload GPX file
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(`/api/gpx-plans/${plan.id}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || "Error al subir el archivo GPX");
      }

      const uploadData = await uploadRes.json();

      // Success!
      resetForm();
      onOpenChange(false);

      if (onUploaded) {
        onUploaded(plan.id);
      } else {
        // Navigate to plan viewer
        router.push(`/dashboard/patient/gpx-plans/${plan.id}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Error al subir el archivo GPX");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setName("");
    setDescription("");
    setEventName("");
    setEventDate("");
    setSportType("running");
    setError("");
  };

  const handleClose = (open: boolean) => {
    if (!isUploading) {
      resetForm();
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo Plan GPS</DialogTitle>
          <DialogDescription>
            Sube un archivo GPX de tu ruta y crea un plan nutricional personalizado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* File upload */}
          <div>
            <Label htmlFor="gpx-file">Archivo GPX *</Label>
            <div className="mt-1">
              <Input
                id="gpx-file"
                type="file"
                accept=".gpx,application/gpx+xml"
                onChange={handleFileChange}
                disabled={isUploading}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <FileUp className="h-4 w-4" />
                <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Archivos de Strava, Garmin Connect, Komoot, etc. (máx. 20MB)
            </p>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name">Nombre del Plan *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Maratón Barcelona 2024"
              disabled={isUploading}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas sobre el plan..."
              rows={3}
              disabled={isUploading}
              maxLength={1000}
            />
          </div>

          {/* Event details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-name">Nombre del Evento</Label>
              <Input
                id="event-name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Ej: Maratón de Barcelona"
                disabled={isUploading}
                maxLength={200}
              />
            </div>
            <div>
              <Label htmlFor="event-date">Fecha del Evento</Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Sport type */}
          <div>
            <Label htmlFor="sport-type">Deporte</Label>
            <Select
              id="sport-type"
              value={sportType}
              onChange={(e) => setSportType(e.target.value)}
              disabled={isUploading}
              className="mt-1"
            >
              <option value="running">Running</option>
              <option value="cycling">Ciclismo</option>
              <option value="triathlon">Triatlón</option>
              <option value="hiking">Senderismo</option>
              <option value="other">Otro</option>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading || !file || !name.trim()}
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Subir y Crear Plan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
