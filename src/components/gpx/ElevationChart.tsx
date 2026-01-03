"use client";

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot } from 'recharts';
import type { GPXTrackPoint } from '@/lib/gpx/parser';
import type { Waypoint } from '@/types/waypoint';
import { isSpatialWaypoint, getWaypointProductName } from '@/types/waypoint';

interface ElevationChartProps {
  trackPoints: GPXTrackPoint[];
  waypoints?: Waypoint[];
  onPointClick?: (point: GPXTrackPoint) => void;
  onWaypointClick?: (waypoint: Waypoint) => void;
  onWaypointHover?: (waypoint: Waypoint | null) => void;
  hoverWaypoint?: Waypoint | null;
  onHover?: (point: GPXTrackPoint | null) => void;
  hoverPoint?: GPXTrackPoint | null;
  height?: number;
}

export const ElevationChart = React.memo(function ElevationChart({
  trackPoints,
  waypoints = [],
  onPointClick,
  onWaypointClick,
  onWaypointHover,
  hoverWaypoint,
  onHover,
  hoverPoint,
  height = 300
}: ElevationChartProps) {
  // Prepare data for chart - Only include points with valid elevation data
  // This prevents "0 m" showing in tooltips for missing elevations
  const chartData = trackPoints
    .filter((point): point is typeof point & { ele: number } => point.ele !== undefined)
    .map(point => ({
      distance: parseFloat((point.distanceFromStart || 0).toFixed(2)),
      elevation: point.ele,  // TypeScript now knows this is always a number
      lat: point.lat,
      lon: point.lon,
    }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (data: any) => {
    if (!onPointClick || !data) return;

    // Use activeIndex which is the EXACT index in chartData - this avoids interpolation issues
    const index = data.activeIndex !== undefined ? parseInt(data.activeIndex) : -1;

    if (isNaN(index) || index < 0 || !chartData[index]) {
      console.log('[ElevationChart] Invalid activeIndex:', data);
      return;
    }

    // Get the EXACT point from chartData (which comes from filtered trackPoints)
    const chartPoint = chartData[index];

    // Find the original trackPoint by lat/lon (unique identifier)
    const point = trackPoints.find(
      p => p.lat === chartPoint.lat && p.lon === chartPoint.lon
    );

    if (point) {
      onPointClick(point);
    } else {
      console.log('[ElevationChart] Could not find trackPoint for chartPoint:', chartPoint);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = (data: any) => {
    if (!onHover) return;

    // Use activeIndex for exact point matching (same as handleClick)
    const index = data?.activeIndex !== undefined ? parseInt(data.activeIndex) : -1;

    if (isNaN(index) || index < 0 || !chartData[index]) {
      onHover(null);
      return;
    }

    // Get the EXACT point from chartData
    const chartPoint = chartData[index];

    // Find the original trackPoint by lat/lon
    const point = trackPoints.find(
      p => p.lat === chartPoint.lat && p.lon === chartPoint.lon
    );

    if (point) {
      onHover(point);
    } else {
      onHover(null);
    }
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null);
    }
  };

  // Calculate min/max for better scaling
  const elevations = chartData.map(d => d.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationRange = maxElevation - minElevation;
  const yAxisMin = Math.floor(minElevation - elevationRange * 0.1);
  const yAxisMax = Math.ceil(maxElevation + elevationRange * 0.1);

  // Find hovered waypoint for tooltip positioning
  const hoveredSpatialWaypoint = hoverWaypoint && isSpatialWaypoint(hoverWaypoint) ? hoverWaypoint : null;

  return (
    <div
      className="w-full bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow relative"
      style={{ height: `${height}px`, cursor: onPointClick ? 'pointer' : 'default', zIndex: 0 }}
    >
      {/* Waypoint hover tooltip */}
      {hoveredSpatialWaypoint && (
        <div
          className="absolute z-50 bg-white/95 backdrop-blur-sm border border-gray-200 p-4 rounded-xl shadow-xl pointer-events-none"
          style={{
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: '200px',
            maxWidth: '280px'
          }}
        >
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">
            Waypoint
          </p>
          <p className="text-lg font-bold mb-2" style={{ color: hoveredSpatialWaypoint.color || '#ef4444' }}>
            {hoveredSpatialWaypoint.name || getWaypointProductName(hoveredSpatialWaypoint)}
          </p>

          <div className="space-y-1 text-sm">
            {hoveredSpatialWaypoint.distance_from_start_km !== undefined && (
              <p className="text-gray-700">
                <span className="font-semibold">Distancia:</span> KM {hoveredSpatialWaypoint.distance_from_start_km.toFixed(2)}
              </p>
            )}
            {hoveredSpatialWaypoint.elevation_m !== undefined && hoveredSpatialWaypoint.elevation_m !== null && (
              <p className="text-gray-700">
                <span className="font-semibold">Elevación:</span> {Math.round(hoveredSpatialWaypoint.elevation_m)} m
              </p>
            )}
            {hoveredSpatialWaypoint.calories !== undefined && hoveredSpatialWaypoint.calories !== null && (
              <p className="text-gray-700">
                <span className="font-semibold">Calorías:</span> {hoveredSpatialWaypoint.calories} kcal
              </p>
            )}
            {hoveredSpatialWaypoint.carbs !== undefined && hoveredSpatialWaypoint.carbs !== null && (
              <p className="text-gray-700">
                <span className="font-semibold">Carbohidratos:</span> {hoveredSpatialWaypoint.carbs.toFixed(1)} g
              </p>
            )}
            {hoveredSpatialWaypoint.notes && (
              <p className="text-gray-600 mt-2 pt-2 border-t border-gray-100 italic text-xs">
                {hoveredSpatialWaypoint.notes}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
            Click para editar
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
        <AreaChart
          data={chartData}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />

          <XAxis
            dataKey="distance"
            type="number"
            domain={['dataMin', 'dataMax']}
            label={{
              value: 'Distancia (km)',
              position: 'insideBottom',
              offset: -5,
              style: { fontSize: 12, fill: '#6b7280' }
            }}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="#e5e7eb"
            tickLine={false}
            axisLine={{ strokeWidth: 1 }}
          />

          <YAxis
            domain={[yAxisMin, yAxisMax]}
            label={{
              value: 'Elevación (m)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#6b7280' }
            }}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="#e5e7eb"
            tickLine={false}
            axisLine={{ strokeWidth: 1 }}
          />

          <Tooltip
            content={({ active, payload }) => {
              // Hide chart tooltip when hovering a waypoint
              if (hoveredSpatialWaypoint) return null;

              if (active && payload && payload[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white/95 backdrop-blur-sm border border-gray-200 p-4 rounded-xl shadow-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">
                      Distancia
                    </p>
                    <p className="text-lg font-bold text-gray-900 mb-2">
                      {data.distance} km
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">
                      Elevación
                    </p>
                    <p className="text-sm font-semibold text-blue-600">
                      {Math.round(data.elevation)} m
                    </p>
                    {onPointClick && (
                      <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
                        Click para agregar waypoint
                      </p>
                    )}
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
            fill="url(#elevationGradient)"
            fillOpacity={1}
            strokeWidth={2.5}
            activeDot={onPointClick ? { r: 6, cursor: 'pointer' } : false}
          />

          {/* Waypoint markers (only spatial waypoints) */}
          {waypoints.filter(isSpatialWaypoint).map((wp, idx) => {
            // Validate waypoint has distance
            if (wp.distance_from_start_km === undefined || wp.distance_from_start_km === null) {
              console.warn('Waypoint missing distance_from_start_km:', wp);
              return null;
            }

            const label = wp.name || wp.product_name || 'Waypoint';
            const distanceLabel = `KM ${wp.distance_from_start_km.toFixed(1)}`;
            const waypointColor = wp.color || '#ef4444';
            const xPos = parseFloat(wp.distance_from_start_km.toFixed(2));
            const isHovered = hoverWaypoint?.id === wp.id;

            return (
              <React.Fragment key={wp.id || idx}>
                {/* Vertical dashed line */}
                <ReferenceLine
                  x={xPos}
                  stroke={waypointColor}
                  strokeWidth={isHovered ? 4 : 3}
                  strokeDasharray="8 4"
                  label={{
                    value: `${distanceLabel}\n${label}`,
                    position: 'top',
                    fill: waypointColor,
                    fontSize: 12,
                    fontWeight: 700,
                    style: {
                      textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white',
                    }
                  }}
                />
                {/* Clickable dot at bottom */}
                <ReferenceDot
                  x={xPos}
                  y={yAxisMin}
                  r={isHovered ? 14 : 10}
                  fill={waypointColor}
                  stroke="white"
                  strokeWidth={isHovered ? 4 : 3}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onWaypointClick?.(wp)}
                  onMouseEnter={() => onWaypointHover?.(wp)}
                  onMouseLeave={() => onWaypointHover?.(null)}
                />
              </React.Fragment>
            );
          })}

          {/* Hover reference line */}
          {hoverPoint && hoverPoint.distanceFromStart !== undefined && (
            <ReferenceLine
              x={parseFloat((hoverPoint.distanceFromStart || 0).toFixed(2))}
              stroke="#6b7280"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: `${hoverPoint.distanceFromStart.toFixed(2)} km`,
                position: 'top',
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
