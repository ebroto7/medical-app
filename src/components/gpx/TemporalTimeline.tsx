"use client";

import React, { useMemo } from 'react';
import type { Waypoint } from '@/types/waypoint';
import { isTemporalWaypoint, isRepeatingWaypoint, expandTemporalLoop, getWaypointProductName } from '@/types/waypoint';

interface TemporalTimelineProps {
  waypoints: Waypoint[];
  totalDuration?: number;  // Duración total estimada en minutos (default 4 horas)
  height?: number;
  onWaypointClick?: (waypoint: Waypoint) => void;
}

interface TimelineMarker {
  time: number;
  waypoint: Waypoint;
  color: string;
  label: string;
}

/**
 * TemporalTimeline Component
 *
 * Displays temporal waypoints (time-based) on a horizontal timeline.
 * Supports both single temporal waypoints and repeating loops.
 *
 * Features:
 * - Filters out spatial waypoints (only shows temporal)
 * - Expands temporal loops into multiple markers
 * - Color-coded markers (custom for loops, gray for single)
 * - Hover labels with time and product name
 * - Click handler for waypoint interaction
 */
export const TemporalTimeline = React.memo(function TemporalTimeline({
  waypoints,
  totalDuration = 240,  // Default 4 hours (240 minutes)
  height = 100,
  onWaypointClick,
}: TemporalTimelineProps) {
  // Filter temporal waypoints and expand loops into individual markers
  const timelineMarkers = useMemo(() => {
    const markers: TimelineMarker[] = [];

    waypoints.forEach(wp => {
      // Skip spatial waypoints
      if (!isTemporalWaypoint(wp)) return;

      if (isRepeatingWaypoint(wp)) {
        // Temporal loop: expand into multiple markers with same color
        const expanded = expandTemporalLoop(wp);
        expanded.forEach(item => {
          markers.push({
            time: item.time,
            waypoint: wp,  // Reference to original loop waypoint
            color: wp.color,  // Use loop's custom color
            label: `${item.time}min - ${getWaypointProductName(wp)}`,
          });
        });
      } else {
        // Temporal single: create one marker
        markers.push({
          time: wp.trigger_time_min,
          waypoint: wp,
          color: wp.color || '#6b7280',  // Gray default if no color
          label: `${wp.trigger_time_min}min - ${getWaypointProductName(wp)}`,
        });
      }
    });

    // Sort markers chronologically
    return markers.sort((a, b) => a.time - b.time);
  }, [waypoints]);

  // Calculate effective duration: max of provided duration and max waypoint time + 10% buffer
  const effectiveDuration = useMemo(() => {
    if (timelineMarkers.length === 0) return totalDuration;

    const maxMarkerTime = Math.max(...timelineMarkers.map(m => m.time));
    // Add 10% buffer after last marker, minimum 30 min
    const minRequiredDuration = maxMarkerTime + Math.max(30, maxMarkerTime * 0.1);

    return Math.max(totalDuration, minRequiredDuration);
  }, [timelineMarkers, totalDuration]);

  // Don't render if no temporal waypoints
  if (timelineMarkers.length === 0) return null;

  return (
    <div
      className="w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3"
      style={{ height: `${height}px` }}
      role="region"
      aria-label="Línea temporal de nutrición"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Línea Temporal
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          0 min → {Math.round(effectiveDuration)} min
        </span>
      </div>

      {/* Timeline track */}
      <div className="relative h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-visible">
        {/* Base line */}
        <div className="absolute inset-0 flex items-center px-2">
          <div className="w-full h-1 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>

        {/* Markers */}
        {timelineMarkers.map((marker, idx) => {
          // Calculate position (percentage from left)
          const leftPercent = Math.min(100, Math.max(0, (marker.time / effectiveDuration) * 100));

          return (
            <div
              key={`${marker.waypoint.id}-${idx}`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform z-10"
              style={{ left: `${leftPercent}%` }}
              onClick={() => onWaypointClick?.(marker.waypoint)}
              title={marker.label}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onWaypointClick?.(marker.waypoint);
                }
              }}
            >
              {/* Marker circle */}
              <div
                className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 shadow-md"
                style={{ backgroundColor: marker.color }}
              ></div>

              {/* Time label above marker */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-sm text-gray-700 dark:text-gray-300">
                  T+{marker.time}&apos;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary - only show last marker time */}
      {timelineMarkers.length > 0 && (
        <div className="mt-1 text-right text-[10px] text-gray-500 dark:text-gray-400">
          Último: T+{timelineMarkers[timelineMarkers.length - 1].time} min
        </div>
      )}
    </div>
  );
});
