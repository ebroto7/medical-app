"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import type { GPXTrackPoint } from '@/lib/gpx/parser';

interface Waypoint {
  id: string;
  distance_from_start_km: number;
  product_name?: string;
  nutrition_type: string;
  trigger_distance_km?: number;
  trigger_time_min?: number;
}

interface ElevationChartProps {
  trackPoints: GPXTrackPoint[];
  waypoints?: Waypoint[];
  onPointClick?: (point: GPXTrackPoint) => void;
  height?: number;
}

export function ElevationChart({
  trackPoints,
  waypoints = [],
  onPointClick,
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

  // Calculate min/max for better scaling
  const elevations = chartData.map(d => d.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationRange = maxElevation - minElevation;
  const yAxisMin = Math.floor(minElevation - elevationRange * 0.1);
  const yAxisMax = Math.ceil(maxElevation + elevationRange * 0.1);

  return (
    <div
      className="w-full bg-white rounded-lg border p-4"
      style={{ height: `${height}px` }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          onClick={handleClick}
          style={{ cursor: onPointClick ? 'pointer' : 'default' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

          <XAxis
            dataKey="distance"
            label={{
              value: 'Distancia (km)',
              position: 'insideBottom',
              offset: -5,
              style: { fontSize: 12 }
            }}
            tick={{ fontSize: 11 }}
            stroke="#666"
          />

          <YAxis
            domain={[yAxisMin, yAxisMax]}
            label={{
              value: 'Elevación (m)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12 }
            }}
            tick={{ fontSize: 11 }}
            stroke="#666"
          />

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border rounded shadow-lg text-sm">
                    <p className="font-semibold text-gray-900">
                      {data.distance} km
                    </p>
                    <p className="text-gray-600">
                      {Math.round(data.elevation)} m
                    </p>
                    {onPointClick && (
                      <p className="text-xs text-muted-foreground mt-1">
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
            fill="#3b82f6"
            fillOpacity={0.3}
            strokeWidth={2}
          />

          {/* Waypoint markers */}
          {waypoints.map((wp, idx) => {
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
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
