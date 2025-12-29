/**
 * GPX Exporter Utility
 *
 * Genera archivos GPX con waypoints nutricionales
 * Compatible con Garmin, Wahoo, Suunto, Polar, Strava, Komoot
 */

import { create } from 'xmlbuilder2';
import type { GPXTrack } from './parser';

export interface NutritionWaypoint {
  latitude: number;
  longitude: number;
  elevation_m?: number;
  trigger_distance_km?: number;
  trigger_time_min?: number;
  nutrition_type: string;
  product_name?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  sodium_mg?: number;
  caffeine_mg?: number;
  quantity?: number;
  quantity_unit?: string;
  notes?: string;
  icon_symbol?: string;
}

/**
 * Genera archivo GPX con track original + waypoints nutricionales
 */
export function generateGPXWithNutrition(
  originalTrack: GPXTrack,
  nutritionWaypoints: NutritionWaypoint[],
  planName: string,
  planDescription?: string
): string {
  const gpx = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('gpx', {
      version: '1.1',
      creator: 'NutriDiary',
      xmlns: 'http://www.topografix.com/GPX/1/1',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd',
    });

  // Metadata
  const metadata = gpx.ele('metadata');
  metadata.ele('name').txt(planName);
  if (planDescription) {
    metadata.ele('desc').txt(planDescription);
  }
  metadata.ele('time').txt(new Date().toISOString());

  // Original track
  const trk = gpx.ele('trk');
  trk.ele('name').txt(originalTrack.name);

  const trkseg = trk.ele('trkseg');
  originalTrack.points.forEach(point => {
    const trkpt = trkseg.ele('trkpt', { lat: point.lat.toString(), lon: point.lon.toString() });
    if (point.ele !== undefined) {
      trkpt.ele('ele').txt(point.ele.toString());
    }
    if (point.time) {
      trkpt.ele('time').txt(point.time.toISOString());
    }
  });

  // Nutrition waypoints
  nutritionWaypoints.forEach(wp => {
    const wpt = gpx.ele('wpt', {
      lat: wp.latitude.toString(),
      lon: wp.longitude.toString(),
    });

    if (wp.elevation_m !== undefined) {
      wpt.ele('ele').txt(wp.elevation_m.toString());
    }

    // Generate universal name (visible en TODOS los dispositivos)
    wpt.ele('name').txt(generateWaypointName(wp));

    // Generate universal description (visible en TODOS los dispositivos)
    wpt.ele('desc').txt(generateWaypointDescription(wp));

    // Symbol for GPS devices
    wpt.ele('sym').txt(wp.icon_symbol || 'Food');

    // Extensions (optional metadata for our app)
    const extensions = wpt.ele('extensions');
    extensions.ele('nutrition:type').txt(wp.nutrition_type);
    if (wp.calories) extensions.ele('nutrition:calories').txt(wp.calories.toString());
    if (wp.carbs) extensions.ele('nutrition:carbs').txt(wp.carbs.toString());
  });

  return gpx.end({ prettyPrint: true });
}

/**
 * Genera nombre universal del waypoint
 * Formato: "KM X / Ymin - Producto"
 * Ejemplo: "KM 25 / 120min - Gel SIS Isotónico"
 */
function generateWaypointName(wp: NutritionWaypoint): string {
  const triggers: string[] = [];

  if (wp.trigger_distance_km) {
    triggers.push(`KM ${wp.trigger_distance_km}`);
  }

  if (wp.trigger_time_min) {
    triggers.push(`${wp.trigger_time_min}min`);
  }

  const location = triggers.length > 0 ? triggers.join(' / ') : 'Waypoint';
  const product = wp.product_name || wp.nutrition_type;

  return `${location} - ${product}`;
}

/**
 * Genera descripción universal del waypoint
 * Formato: "87 kcal, 22g carbs, 75mg cafeína | 1 gel | Con 200ml agua"
 */
function generateWaypointDescription(wp: NutritionWaypoint): string {
  const parts: string[] = [];

  // Macros
  const macros: string[] = [];
  if (wp.calories) macros.push(`${wp.calories} kcal`);
  if (wp.carbs) macros.push(`${wp.carbs}g carbs`);
  if (wp.protein) macros.push(`${wp.protein}g prot`);
  if (wp.sodium_mg) macros.push(`${wp.sodium_mg}mg Na`);
  if (wp.caffeine_mg) macros.push(`${wp.caffeine_mg}mg cafeína`);

  if (macros.length > 0) {
    parts.push(macros.join(', '));
  }

  // Quantity
  if (wp.quantity && wp.quantity_unit) {
    parts.push(`${wp.quantity}${wp.quantity_unit}`);
  }

  // Notes
  if (wp.notes) {
    parts.push(wp.notes);
  }

  return parts.join(' | ');
}
