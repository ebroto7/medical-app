"use client";

import { useMemo } from "react";
import type { GPXTrackPoint } from '@/lib/gpx/parser';
import type { Waypoint } from '@/types/waypoint';
import { isSpatialWaypoint, getWaypointProductName } from '@/types/waypoint';
import dynamic from "next/dynamic";

// Dynamic imports to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then(m => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then(m => m.TileLayer),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then(m => m.Polyline),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then(m => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then(m => m.Popup),
  { ssr: false }
);

interface InteractiveMapProps {
  trackPoints: GPXTrackPoint[];
  waypoints?: Waypoint[];
  hoverPoint?: GPXTrackPoint | null;
  onPointClick?: (point: GPXTrackPoint) => void;
  onHover?: (point: GPXTrackPoint | null) => void;
  height?: number;
}

export function InteractiveMap({
  trackPoints,
  waypoints = [],
  hoverPoint,
  onPointClick,
  onHover,
  height = 400
}: InteractiveMapProps) {
  // Calculate map center (middle point of route)
  const mapCenter = useMemo(() => {
    if (trackPoints.length === 0) return [41.3851, 2.1734] as [number, number];
    const midIndex = Math.floor(trackPoints.length / 2);
    const midPoint = trackPoints[midIndex];
    return [midPoint.lat, midPoint.lon] as [number, number];
  }, [trackPoints]);

  // Convert track points to polyline coordinates
  const polylinePositions = useMemo(() => {
    return trackPoints.map(p => [p.lat, p.lon] as [number, number]);
  }, [trackPoints]);

  // Calculate bounds for auto-fitting the map
  const bounds = useMemo(() => {
    if (trackPoints.length === 0) return undefined;

    const lats = trackPoints.map(p => p.lat);
    const lons = trackPoints.map(p => p.lon);

    return [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    ] as [[number, number], [number, number]];
  }, [trackPoints]);

  if (trackPoints.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-2xl"
        style={{ height: `${height}px` }}
      >
        <p className="text-gray-500 text-sm">No hay datos de ruta disponibles</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full"
      style={{ height: `${height}px`, width: '100%' }}
    >
      {typeof window !== 'undefined' && (
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          bounds={bounds}
          boundsOptions={{ padding: [50, 50] }}
          scrollWheelZoom={true}
        >
          {/* OpenStreetMap tiles (standard, not dark) */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Route polyline */}
          {polylinePositions.length > 0 && (
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: "#3b82f6",
                weight: 5,
                opacity: 0.9,
              }}
              eventHandlers={{
              mouseover: (e) => {
                if (onHover && trackPoints.length > 0) {
                  // Find closest point to mouse position
                  const latlng = e.latlng;
                  const closest = trackPoints.reduce((prev, curr) => {
                    const prevDist = Math.sqrt(
                      Math.pow(prev.lat - latlng.lat, 2) +
                      Math.pow(prev.lon - latlng.lng, 2)
                    );
                    const currDist = Math.sqrt(
                      Math.pow(curr.lat - latlng.lat, 2) +
                      Math.pow(curr.lon - latlng.lng, 2)
                    );
                    return currDist < prevDist ? curr : prev;
                  });
                  onHover(closest);
                }
              },
              mouseout: () => {
                if (onHover) {
                  onHover(null);
                }
              }
            }}
            />
          )}

          {/* Start marker */}
          {trackPoints[0] && (
            <Marker position={[trackPoints[0].lat, trackPoints[0].lon]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">Inicio</p>
                  {trackPoints[0].ele && (
                    <p className="text-gray-600">{Math.round(trackPoints[0].ele)} m</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* End marker */}
          {trackPoints[trackPoints.length - 1] && trackPoints.length > 1 && (() => {
            const endPoint = trackPoints[trackPoints.length - 1];
            return (
              <Marker position={[endPoint.lat, endPoint.lon]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">Final</p>
                    {endPoint.ele !== undefined && (
                      <p className="text-gray-600">
                        {Math.round(endPoint.ele)} m
                      </p>
                    )}
                    {endPoint.distanceFromStart !== undefined && (
                      <p className="text-blue-600">
                        {endPoint.distanceFromStart.toFixed(2)} km
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })()}

          {/* Hover point marker (synchronized with elevation chart) */}
          {hoverPoint && (
            <Marker position={[hoverPoint.lat, hoverPoint.lon]}>
              <Popup>
                <div className="text-sm">
                  <p className="text-xs text-gray-500 uppercase mb-1">Punto Actual</p>
                  {hoverPoint.distanceFromStart && (
                    <p className="font-bold text-gray-900">
                      {hoverPoint.distanceFromStart.toFixed(2)} km
                    </p>
                  )}
                  {hoverPoint.ele && (
                    <p className="text-blue-600 font-semibold">
                      {Math.round(hoverPoint.ele)} m
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Spatial waypoint markers (nutrition waypoints with coordinates) */}
          {waypoints.filter(isSpatialWaypoint).map((waypoint, idx) => (
            <Marker
              key={waypoint.id || idx}
              position={[waypoint.latitude, waypoint.longitude]}
            >
              <Popup>
                <div className="text-sm">
                  <p className="text-xs text-gray-500 uppercase mb-1 font-medium">Waypoint Nutricional</p>
                  <p className="font-bold text-orange-600 mb-2">
                    {getWaypointProductName(waypoint)}
                  </p>

                  <div className="space-y-1 text-xs">
                    <p className="text-gray-700">
                      <span className="font-semibold">Distancia:</span> KM {waypoint.distance_from_start_km.toFixed(1)}
                    </p>
                    {waypoint.elevation_m !== undefined && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Elevación:</span> {Math.round(waypoint.elevation_m)} m
                      </p>
                    )}
                    {waypoint.calories !== undefined && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Calorías:</span> {waypoint.calories} kcal
                      </p>
                    )}
                    {waypoint.carbs !== undefined && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Carbohidratos:</span> {waypoint.carbs.toFixed(1)} g
                      </p>
                    )}
                    {waypoint.notes && (
                      <p className="text-gray-600 mt-2 pt-2 border-t border-gray-200 italic">
                        {waypoint.notes}
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
