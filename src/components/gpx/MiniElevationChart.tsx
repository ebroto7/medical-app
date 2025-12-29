"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip } from 'recharts';
import type { GPXTrackPoint } from '@/lib/gpx/parser';
import type { Waypoint } from '@/types/waypoint';
import { isSpatialWaypoint } from '@/types/waypoint';

interface MiniElevationChartProps {
  trackPoints: GPXTrackPoint[];
  waypoints?: Waypoint[];
  hoverPoint?: GPXTrackPoint | null;
  onHover?: (point: GPXTrackPoint | null) => void;
  height?: number;
}

export function MiniElevationChart({
  trackPoints,
  waypoints = [],
  hoverPoint,
  onHover,
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

  const elevations = chartData.map(d => d.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationRange = maxElevation - minElevation;
  const yAxisMin = Math.floor(minElevation - elevationRange * 0.1);
  const yAxisMax = Math.ceil(maxElevation + elevationRange * 0.1);

  if (chartData.length === 0) return null;

  const totalDistance = trackPoints[trackPoints.length - 1]?.distanceFromStart || 0;
  const maxElev = Math.max(...elevations);
  const minElev = Math.min(...elevations);

  return (
    <div
      className="w-full bg-white/95 backdrop-blur-sm border-t-2 border-gray-300 shadow-xl relative"
      style={{ height: `${height}px`, minHeight: `${height}px` }}
    >
      {/* Distance and Elevation Labels */}
      <div className="absolute top-1 left-3 right-3 flex justify-between items-start z-10 text-xs font-semibold text-gray-700 pointer-events-none">
        <span>0 km</span>
        <span className="text-blue-600">{minElev.toFixed(0)}m - {maxElev.toFixed(0)}m</span>
        <span>{totalDistance.toFixed(1)} km</span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
        >
          <defs>
            <linearGradient id="miniElevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
            </linearGradient>
          </defs>

          {/* Minimal axes - no labels */}
          <XAxis
            dataKey="distance"
            tick={false}
            axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
            tickLine={false}
          />

          <YAxis
            domain={[yAxisMin, yAxisMax]}
            tick={false}
            axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
            tickLine={false}
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

          {/* Waypoint markers (minimal - only spatial waypoints) */}
          {waypoints.filter(isSpatialWaypoint).map((wp, idx) => (
            <ReferenceLine
              key={wp.id || idx}
              x={parseFloat((wp.distance_from_start_km || 0).toFixed(2))}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
