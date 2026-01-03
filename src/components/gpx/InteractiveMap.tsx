"use client";

import React, { useMemo, useEffect } from "react";
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
const Tooltip = dynamic(
  () => import("react-leaflet").then(m => m.Tooltip),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then(m => m.CircleMarker),
  { ssr: false }
);

interface InteractiveMapProps {
  trackPoints: GPXTrackPoint[];
  waypoints?: Waypoint[];
  hoverPoint?: GPXTrackPoint | null;
  hoverWaypoint?: Waypoint | null;
  onPointClick?: (point: GPXTrackPoint) => void;
  onHover?: (point: GPXTrackPoint | null) => void;
  onWaypointHover?: (waypoint: Waypoint | null) => void;
  onWaypointClick?: (waypoint: Waypoint) => void;
  height?: number;
}

export const InteractiveMap = React.memo(function InteractiveMap({
  trackPoints,
  waypoints = [],
  hoverPoint,
  hoverWaypoint,
  onPointClick,
  onHover,
  onWaypointHover,
  onWaypointClick,
  height = 400
}: InteractiveMapProps) {
  // Fix Leaflet marker icons (they don't load by default in Next.js)
  // Use dynamic import to ensure Leaflet is loaded before configuring icons
  useEffect(() => {
    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet-markers/marker-icon-2x.png',
        iconUrl: '/leaflet-markers/marker-icon.png',
        shadowUrl: '/leaflet-markers/marker-shadow.png',
      });
    }).catch((error) => {
      console.error('Failed to load Leaflet icon configuration:', error);
    });
  }, []);

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
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ height: `${height}px`, width: '100%', zIndex: 0 }}
    >
      {typeof window !== 'undefined' && (
        <MapContainer
          center={mapCenter}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
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
              click: (e) => {
                if (onPointClick && trackPoints.length > 0) {
                  // Find closest point to click position
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
                  onPointClick(closest);
                }
              },
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
          {waypoints.filter(isSpatialWaypoint).map((waypoint, idx) => {
            // Only render if waypoint has valid coordinates
            if (!waypoint.latitude || !waypoint.longitude) {
              console.warn('Waypoint missing coordinates:', waypoint);
              return null;
            }

            const isHovered = hoverWaypoint?.id === waypoint.id;
            const wpColor = waypoint.color || '#ea580c';

            return (
              <React.Fragment key={waypoint.id || idx}>
                {/* Highlight circle when hovered from chart */}
                {isHovered && (
                  <CircleMarker
                    center={[waypoint.latitude, waypoint.longitude]}
                    radius={25}
                    pathOptions={{
                      color: wpColor,
                      weight: 3,
                      opacity: 0.8,
                      fillColor: wpColor,
                      fillOpacity: 0.2,
                    }}
                  />
                )}
                <Marker
                  position={[waypoint.latitude, waypoint.longitude]}
                  eventHandlers={{
                    mouseover: () => onWaypointHover?.(waypoint),
                    mouseout: () => onWaypointHover?.(null),
                    click: () => onWaypointClick?.(waypoint),
                  }}
                >
                  {/* Tooltip shows on hover */}
                  <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                    <div className="text-sm min-w-[180px]">
                      <p className="text-xs text-gray-500 uppercase mb-1 font-medium">WAYPOINT</p>
                      <p className="font-bold mb-2" style={{ color: wpColor }}>
                        {waypoint.name || getWaypointProductName(waypoint)}
                      </p>

                      <div className="space-y-1 text-xs">
                        {waypoint.distance_from_start_km !== undefined && waypoint.distance_from_start_km !== null && (
                          <p className="text-gray-700">
                            <span className="font-semibold">Distancia:</span> KM {waypoint.distance_from_start_km.toFixed(2)}
                          </p>
                        )}
                        {waypoint.elevation_m !== undefined && waypoint.elevation_m !== null && (
                          <p className="text-gray-700">
                            <span className="font-semibold">Elevación:</span> {Math.round(waypoint.elevation_m)} m
                          </p>
                        )}
                        {waypoint.calories !== undefined && waypoint.calories !== null && (
                          <p className="text-gray-700">
                            <span className="font-semibold">Calorías:</span> {waypoint.calories} kcal
                          </p>
                        )}
                        {waypoint.carbs !== undefined && waypoint.carbs !== null && (
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

                      <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                        Click para editar
                      </p>
                    </div>
                  </Tooltip>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      )}
    </div>
  );
});
