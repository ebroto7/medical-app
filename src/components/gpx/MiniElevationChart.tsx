"use client";

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceLine, ReferenceDot, Tooltip } from 'recharts';
import type { GPXTrackPoint } from '@/lib/gpx/parser';
import type { Waypoint } from '@/types/waypoint';
import { isSpatialWaypoint } from '@/types/waypoint';

interface MiniElevationChartProps {
  trackPoints: GPXTrackPoint[];
  waypoints?: Waypoint[];
  hoverPoint?: GPXTrackPoint | null;
  hoverWaypoint?: Waypoint | null;
  onHover?: (point: GPXTrackPoint | null) => void;
  onWaypointHover?: (waypoint: Waypoint | null) => void;
  onWaypointClick?: (waypoint: Waypoint) => void;
  height?: number;
}

export const MiniElevationChart = React.memo(function MiniElevationChart({
  trackPoints,
  waypoints = [],
  hoverPoint,
  hoverWaypoint,
  onHover,
  onWaypointHover,
  onWaypointClick,
  height = 100
}: MiniElevationChartProps) {
  // Same data prep as ElevationChart
  const chartData = trackPoints
    .filter((point): point is typeof point & { ele: number } => point.ele !== undefined)
    .map(point => ({
      distance: parseFloat((point.distanceFromStart || 0).toFixed(2)),
      elevation: point.ele,
      lat: point.lat,
      lon: point.lon,
    }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = (data: any) => {
    if (!onHover) return;

    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      const point = trackPoints.find(
        p => p.lat === payload.lat && p.lon === payload.lon
      );
      if (point) {
        onHover(point);
      }
    } else {
      onHover(null);
    }
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null);
    }
  };

  if (chartData.length === 0) return null;

  // Calculate Y axis bounds for ReferenceDot positioning
  const elevations = chartData.map(d => d.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationRange = maxElevation - minElevation;
  const yAxisMin = Math.floor(minElevation - elevationRange * 0.1);
  const yAxisMax = Math.ceil(maxElevation + elevationRange * 0.1);

  return (
    <div
      className="w-full bg-white rounded-lg shadow-sm border border-gray-200 relative"
      style={{ height: `${height}px`, minHeight: `${height}px`, width: '100%' }}
    >
      <ResponsiveContainer width="100%" height={height} minWidth={200} minHeight={height}>
        <AreaChart
          data={chartData}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <defs>
            <linearGradient id="miniElevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
            </linearGradient>
          </defs>

          {/* X axis - hidden but functional (required for ReferenceLine positioning) */}
          <XAxis
            dataKey="distance"
            type="number"
            domain={['dataMin', 'dataMax']}
            hide={true}
          />

          {/* Y axis - hidden but functional (required for ReferenceDot positioning) */}
          <YAxis
            domain={[yAxisMin, yAxisMax]}
            hide={true}
          />

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white/95 backdrop-blur-sm border border-gray-300 px-3 py-2 rounded-lg shadow-lg">
                    <p className="text-xs font-bold text-gray-900">
                      {data.distance} km
                    </p>
                    <p className="text-xs font-semibold text-blue-600">
                      {Math.round(data.elevation)} m
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />

          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#3b82f6"
            fill="url(#miniElevationGradient)"
            fillOpacity={1}
            strokeWidth={2}
          />

          {/* Hover reference line */}
          {hoverPoint && hoverPoint.distanceFromStart !== undefined && (
            <ReferenceLine
              x={parseFloat((hoverPoint.distanceFromStart || 0).toFixed(2))}
              stroke="#ef4444"
              strokeWidth={2}
              label={{
                value: `${Math.round(hoverPoint.ele || 0)}m`,
                position: 'top',
                fill: '#ef4444',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
          )}

          {/* Waypoint markers (spatial waypoints) - vertical dotted lines + clickable dots */}
          {waypoints.filter(isSpatialWaypoint).map((wp, idx) => {
            // Validate waypoint has distance (same as ElevationChart)
            if (wp.distance_from_start_km === undefined || wp.distance_from_start_km === null) {
              return null;
            }

            const wpColor = wp.color || '#ef4444'; // Default red if no color
            const xPos = parseFloat(wp.distance_from_start_km.toFixed(2));
            const isHovered = hoverWaypoint?.id === wp.id;

            return (
              <React.Fragment key={wp.id || idx}>
                {/* Vertical dashed line */}
                <ReferenceLine
                  x={xPos}
                  stroke={wpColor}
                  strokeWidth={isHovered ? 4 : 3}
                  strokeDasharray="6 3"
                />
                {/* Clickable dot at bottom */}
                <ReferenceDot
                  x={xPos}
                  y={yAxisMin}
                  r={isHovered ? 10 : 7}
                  fill={wpColor}
                  stroke="white"
                  strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onWaypointClick?.(wp)}
                  onMouseEnter={() => onWaypointHover?.(wp)}
                  onMouseLeave={() => onWaypointHover?.(null)}
                />
              </React.Fragment>
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
