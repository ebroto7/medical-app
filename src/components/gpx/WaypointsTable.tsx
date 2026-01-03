"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, MapPin, Clock, Repeat, ArrowUpDown } from "lucide-react";
import type { Waypoint } from "@/types/waypoint";
import { isSpatialWaypoint, isRepeatingWaypoint, isTemporalWaypoint } from "@/types/waypoint";

interface WaypointsTableProps {
  waypoints: Waypoint[];
  onEdit: (waypoint: Waypoint) => void;
  onDelete: (waypointId: string) => void;
}

type SortBy = 'km' | 'time';
type SortOrder = 'asc' | 'desc';

export const WaypointsTable = React.memo(function WaypointsTable({ waypoints, onEdit, onDelete }: WaypointsTableProps) {
  const [sortBy, setSortBy] = useState<SortBy>('km');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Toggle sort when clicking on a column header
  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      // Toggle order if same column
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Change column and reset to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Get sortable value for a waypoint
  const getSortValue = (wp: Waypoint, by: SortBy): number => {
    if (by === 'km') {
      if (isSpatialWaypoint(wp)) {
        return wp.distance_from_start_km;
      }
      // Temporal waypoints go to end when sorting by km
      return Infinity;
    } else {
      // Sort by time
      if (isRepeatingWaypoint(wp)) {
        return wp.repeat_config.start_time_min;
      }
      if (isTemporalWaypoint(wp) && !isRepeatingWaypoint(wp)) {
        return wp.trigger_time_min;
      }
      // Spatial waypoints go to end when sorting by time
      return Infinity;
    }
  };

  // Sort waypoints
  const sortedWaypoints = useMemo(() => {
    return [...waypoints].sort((a, b) => {
      const aValue = getSortValue(a, sortBy);
      const bValue = getSortValue(b, sortBy);

      // Handle Infinity values (keep them at end regardless of sort order)
      if (aValue === Infinity && bValue === Infinity) return 0;
      if (aValue === Infinity) return 1;
      if (bValue === Infinity) return -1;

      const diff = aValue - bValue;
      return sortOrder === 'asc' ? diff : -diff;
    });
  }, [waypoints, sortBy, sortOrder]);

  // Get time display for a waypoint
  const getTimeDisplay = (wp: Waypoint): string => {
    if (isRepeatingWaypoint(wp)) {
      const { start_time_min, interval_min } = wp.repeat_config;
      return `${start_time_min}min (c/${interval_min}min)`;
    }
    if (isTemporalWaypoint(wp) && !isRepeatingWaypoint(wp)) {
      return `${wp.trigger_time_min} min`;
    }
    return '—';
  };

  // Get type icon for a waypoint
  const getTypeIcon = (wp: Waypoint) => {
    if (isSpatialWaypoint(wp)) {
      return <MapPin className="h-4 w-4 text-blue-500" />;
    }
    if (isRepeatingWaypoint(wp)) {
      return <Repeat className="h-4 w-4 text-purple-500" />;
    }
    return <Clock className="h-4 w-4 text-orange-500" />;
  };

  // Get type label for tooltip
  const getTypeLabel = (wp: Waypoint): string => {
    if (isSpatialWaypoint(wp)) return 'Espacial (KM)';
    if (isRepeatingWaypoint(wp)) return 'Repetición';
    return 'Temporal';
  };

  if (waypoints.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No hay waypoints aún</p>
        <p className="text-sm mt-2">
          Haz click en el gráfico de elevación para agregar uno
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">Tipo</TableHead>
            <TableHead
              className="w-20 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleSort('km')}
            >
              <div className="flex items-center gap-1">
                KM
                <ArrowUpDown className={`h-3 w-3 ${sortBy === 'km' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            </TableHead>
            <TableHead
              className="w-28 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleSort('time')}
            >
              <div className="flex items-center gap-1">
                Tiempo
                <ArrowUpDown className={`h-3 w-3 ${sortBy === 'time' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            </TableHead>
            <TableHead className="w-16 text-center">Reps</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="max-w-[200px]">Descripción</TableHead>
            <TableHead className="w-24 text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedWaypoints.map((wp) => {
            const rowColor = wp.color || '#ef4444';
            return (
            <TableRow
              key={wp.id}
              className="cursor-pointer transition-colors"
              style={{
                backgroundColor: `${rowColor}10`,
                borderLeft: `4px solid ${rowColor}`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${rowColor}25`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${rowColor}10`}
              onClick={() => onEdit(wp)}
            >
              {/* Tipo */}
              <TableCell className="text-center" title={getTypeLabel(wp)}>
                {getTypeIcon(wp)}
              </TableCell>

              {/* KM */}
              <TableCell className="font-mono text-sm">
                {isSpatialWaypoint(wp)
                  ? wp.distance_from_start_km.toFixed(1)
                  : <span className="text-muted-foreground">—</span>
                }
              </TableCell>

              {/* Tiempo */}
              <TableCell className="font-mono text-sm">
                {getTimeDisplay(wp) !== '—'
                  ? getTimeDisplay(wp)
                  : <span className="text-muted-foreground">—</span>
                }
              </TableCell>

              {/* Repeticiones */}
              <TableCell className="text-center font-mono text-sm">
                {isRepeatingWaypoint(wp)
                  ? wp.repeat_config.repetitions
                  : <span className="text-muted-foreground">—</span>
                }
              </TableCell>

              {/* Nombre */}
              <TableCell className="font-medium">
                <div>
                  <span>{wp.name || 'Sin nombre'}</span>
                  {wp.product_name && wp.product_name !== wp.name && (
                    <span className="text-muted-foreground text-xs ml-2">
                      ({wp.product_name})
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Descripción */}
              <TableCell className="max-w-[200px]">
                {wp.notes ? (
                  <span className="text-sm text-muted-foreground truncate block" title={wp.notes}>
                    {wp.notes}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>

              {/* Acciones */}
              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(wp);
                    }}
                    title="Editar waypoint"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(wp.id);
                    }}
                    title="Eliminar waypoint"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
          })}
        </TableBody>
      </Table>
    </div>
  );
});
