"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import type { GPXTrackPoint } from '@/lib/gpx/parser';
import type { Waypoint } from '@/types/waypoint';
import { isSpatialWaypoint } from '@/types/waypoint';

interface ElevationChartProps {
  trackPoints: GPXTrackPoint[];
  waypoints?: Waypoint[];
  onPointClick?: (point: GPXTrackPoint) => void;
  onHover?: (point: GPXTrackPoint | null) => void;
  hoverPoint?: GPXTrackPoint | null;
  height?: number;
}

export function ElevationChart({
  trackPoints,
  waypoints = [],
  onPointClick,
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
    if (onPointClick && data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      const point = trackPoints.find(
        p => p.lat === payload.lat && p.lon === payload.lon
      );
      if (point) {
        onPointClick(point);
      }
    }
  };

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

  // Calculate min/max for better scaling
  const elevations = chartData.map(d => d.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationRange = maxElevation - minElevation;
  const yAxisMin = Math.floor(minElevation - elevationRange * 0.1);
  const yAxisMax = Math.ceil(maxElevation + elevationRange * 0.1);

  return (
    <div
      className="w-full bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
      style={{ height: `${height}px` }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: onPointClick ? 'pointer' : 'default' }}
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
          />

          {/* Waypoint markers (only spatial waypoints) */}
          {waypoints.filter(isSpatialWaypoint).map((wp, idx) => {
            const label = wp.product_name || wp.nutrition_type;
            const triggers = [];
            if (wp.trigger_distance_km) triggers.push(`KM ${wp.trigger_distance_km}`);
            if (wp.trigger_time_min) triggers.push(`${wp.trigger_time_min}min`);
            const triggerText = triggers.join(' / ');

            return (
              <ReferenceLine
                key={wp.id || idx}
                x={parseFloat((wp.distance_from_start_km || 0).toFixed(2))}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `${triggerText}\n${label}`,
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
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
}
