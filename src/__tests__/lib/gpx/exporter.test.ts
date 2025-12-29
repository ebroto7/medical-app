/**
 * GPX Exporter Tests
 * Tests for GPX file generation with nutrition waypoints
 */
import { describe, it, expect } from 'vitest';
import { generateGPXWithNutrition } from '@/lib/gpx/exporter';
import type { GPXTrack } from '@/lib/gpx/parser';
import type { NutritionWaypoint } from '@/lib/gpx/exporter';

const mockTrack: GPXTrack = {
  name: 'Test Marathon Route',
  points: [
    { lat: 41.3851, lon: 2.1734, ele: 10, distanceFromStart: 0 },
    { lat: 41.3852, lon: 2.1735, ele: 15, distanceFromStart: 1.2 },
    { lat: 41.3853, lon: 2.1736, ele: 12, distanceFromStart: 2.4 },
    { lat: 41.3854, lon: 2.1737, ele: 20, distanceFromStart: 3.6, time: new Date('2024-12-25T10:00:00Z') },
  ],
};

const mockWaypoints: NutritionWaypoint[] = [
  {
    latitude: 41.3852,
    longitude: 2.1735,
    elevation_m: 15,
    trigger_distance_km: 5,
    trigger_time_min: 30,
    nutrition_type: 'energy_gel',
    product_name: 'SIS Isotonic Gel',
    calories: 87,
    carbs: 22,
    sodium_mg: 75,
    caffeine_mg: 75,
    quantity: 1,
    quantity_unit: 'gel',
    notes: 'Tomar con 200ml agua',
    icon_symbol: 'Food',
  },
  {
    latitude: 41.3853,
    longitude: 2.1736,
    elevation_m: 12,
    trigger_distance_km: 10,
    nutrition_type: 'hydration',
    product_name: 'Agua',
    quantity: 250,
    quantity_unit: 'ml',
    icon_symbol: 'Water',
  },
];

describe('GPX Exporter', () => {
  describe('generateGPXWithNutrition', () => {
    it('should generate valid XML structure', () => {
      const result = generateGPXWithNutrition(mockTrack, [], 'Test Plan');

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<gpx');
      expect(result).toContain('version="1.1"');
      expect(result).toContain('creator="NutriDiary"');
      expect(result).toContain('</gpx>');
    });

    it('should include GPX 1.1 namespace declarations', () => {
      const result = generateGPXWithNutrition(mockTrack, [], 'Test Plan');

      expect(result).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
      expect(result).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(result).toContain('xsi:schemaLocation');
    });

    it('should include metadata with plan name', () => {
      const result = generateGPXWithNutrition(mockTrack, [], 'Marathon Barcelona 2024');

      expect(result).toContain('<metadata>');
      expect(result).toContain('<name>Marathon Barcelona 2024</name>');
      expect(result).toContain('</metadata>');
    });

    it('should include metadata with description if provided', () => {
      const result = generateGPXWithNutrition(
        mockTrack,
        [],
        'Test Plan',
        'Plan de nutrición para maratón'
      );

      expect(result).toContain('<desc>Plan de nutrición para maratón</desc>');
    });

    it('should include current timestamp in metadata', () => {
      const result = generateGPXWithNutrition(mockTrack, [], 'Test Plan');

      expect(result).toContain('<time>');
      expect(result).toMatch(/<time>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format
    });

    it('should include original track with all points', () => {
      const result = generateGPXWithNutrition(mockTrack, [], 'Test Plan');

      expect(result).toContain('<trk>');
      expect(result).toContain('<name>Test Marathon Route</name>');
      expect(result).toContain('<trkseg>');

      // Should have 4 track points
      const trkptMatches = result.match(/<trkpt/g);
      expect(trkptMatches).toHaveLength(4);
    });

    it('should preserve track point coordinates', () => {
      const result = generateGPXWithNutrition(mockTrack, [], 'Test Plan');

      expect(result).toContain('lat="41.3851"');
      expect(result).toContain('lon="2.1734"');
      expect(result).toContain('lat="41.3854"');
      expect(result).toContain('lon="2.1737"');
    });

    it('should preserve track point elevation', () => {
      const result = generateGPXWithNutrition(mockTrack, [], 'Test Plan');

      expect(result).toContain('<ele>10</ele>');
      expect(result).toContain('<ele>15</ele>');
      expect(result).toContain('<ele>12</ele>');
      expect(result).toContain('<ele>20</ele>');
    });

    it('should preserve track point time if available', () => {
      const result = generateGPXWithNutrition(mockTrack, [], 'Test Plan');

      expect(result).toContain('<time>2024-12-25T10:00:00');
    });

    it('should add nutrition waypoints', () => {
      const result = generateGPXWithNutrition(mockTrack, mockWaypoints, 'Test Plan');

      // Should have 2 waypoint markers
      const wptMatches = result.match(/<wpt/g);
      expect(wptMatches).toHaveLength(2);
    });

    it('should generate waypoint with coordinates', () => {
      const result = generateGPXWithNutrition(mockTrack, mockWaypoints, 'Test Plan');

      expect(result).toContain('lat="41.3852"');
      expect(result).toContain('lon="2.1735"');
    });

    it('should generate waypoint with elevation', () => {
      const result = generateGPXWithNutrition(mockTrack, mockWaypoints, 'Test Plan');

      expect(result).toContain('<ele>15</ele>');
    });

    it('should generate descriptive waypoint name with dual triggers', () => {
      const result = generateGPXWithNutrition(mockTrack, mockWaypoints, 'Test Plan');

      // First waypoint has both distance and time triggers
      expect(result).toContain('<name>KM 5 / 30min - SIS Isotonic Gel</name>');
    });

    it('should generate waypoint name with only distance trigger', () => {
      const result = generateGPXWithNutrition(mockTrack, mockWaypoints, 'Test Plan');

      // Second waypoint has only distance trigger
      expect(result).toContain('<name>KM 10 - Agua</name>');
    });

    it('should generate comprehensive waypoint description', () => {
      const result = generateGPXWithNutrition(mockTrack, mockWaypoints, 'Test Plan');

      // Should include macros, quantity, and notes
      expect(result).toContain('87 kcal');
      expect(result).toContain('22g carbs');
      expect(result).toContain('75mg Na');
      expect(result).toContain('75mg cafeína');
      expect(result).toContain('1gel');
      expect(result).toContain('Tomar con 200ml agua');
    });

    it('should include nutrition type in extensions', () => {
      const result = generateGPXWithNutrition(mockTrack, mockWaypoints, 'Test Plan');

      expect(result).toContain('<extensions>');
      expect(result).toMatch(/<nutrition:type[^>]*>energy_gel<\/nutrition:type>/);
      expect(result).toMatch(/<nutrition:type[^>]*>hydration<\/nutrition:type>/);
    });

    it('should include calories in extensions', () => {
      const result = generateGPXWithNutrition(mockTrack, mockWaypoints, 'Test Plan');

      expect(result).toMatch(/<nutrition:calories[^>]*>87<\/nutrition:calories>/);
    });

    it('should include carbs in extensions', () => {
      const result = generateGPXWithNutrition(mockTrack, mockWaypoints, 'Test Plan');

      expect(result).toMatch(/<nutrition:carbs[^>]*>22<\/nutrition:carbs>/);
    });

    it('should set waypoint symbol for GPS devices', () => {
      const result = generateGPXWithNutrition(mockTrack, mockWaypoints, 'Test Plan');

      expect(result).toContain('<sym>Food</sym>');
      expect(result).toContain('<sym>Water</sym>');
    });

    it('should use default Food symbol if not specified', () => {
      const waypointWithoutSymbol: NutritionWaypoint[] = [
        {
          latitude: 41.3851,
          longitude: 2.1734,
          trigger_distance_km: 1,
          nutrition_type: 'energy_gel',
        },
      ];

      const result = generateGPXWithNutrition(mockTrack, waypointWithoutSymbol, 'Test Plan');

      expect(result).toContain('<sym>Food</sym>');
    });

    it('should handle waypoint with minimal data', () => {
      const minimalWaypoint: NutritionWaypoint[] = [
        {
          latitude: 41.3851,
          longitude: 2.1734,
          trigger_distance_km: 1,
          nutrition_type: 'hydration',
        },
      ];

      const result = generateGPXWithNutrition(mockTrack, minimalWaypoint, 'Test Plan');

      expect(result).toContain('<wpt');
      expect(result).toContain('lat="41.3851"');
      expect(result).toMatch(/<nutrition:type[^>]*>hydration<\/nutrition:type>/);
    });

    it('should handle waypoint with only time trigger', () => {
      const timeOnlyWaypoint: NutritionWaypoint[] = [
        {
          latitude: 41.3851,
          longitude: 2.1734,
          trigger_time_min: 60,
          nutrition_type: 'energy_gel',
          product_name: 'Gel',
        },
      ];

      const result = generateGPXWithNutrition(mockTrack, timeOnlyWaypoint, 'Test Plan');

      expect(result).toContain('<name>60min - Gel</name>');
    });

    it('should handle empty waypoints array', () => {
      const result = generateGPXWithNutrition(mockTrack, [], 'Test Plan');

      // Should have track but no waypoints
      expect(result).toContain('<trk>');
      const wptMatches = result.match(/<wpt/g);
      expect(wptMatches).toBeNull();
    });

    it('should generate well-formed XML', () => {
      const result = generateGPXWithNutrition(mockTrack, mockWaypoints, 'Test Plan');

      // Should not have obvious XML errors
      expect(result).not.toContain('<<');
      expect(result).not.toContain('>>');
      expect(result).not.toContain('<//>');

      // Should have matching tags
      const openTags = result.match(/<[^\/][^>]*>/g)?.length || 0;
      const closeTags = result.match(/<\/[^>]+>/g)?.length || 0;
      const selfClosingTags = result.match(/<[^>]+\/>/g)?.length || 0;

      // Open tags should equal close tags + self-closing tags
      expect(openTags).toBeGreaterThan(0);
      expect(closeTags).toBeGreaterThan(0);
    });

    it('should handle track without elevation data', () => {
      const noElevationTrack: GPXTrack = {
        name: 'Flat Route',
        points: [
          { lat: 41.3851, lon: 2.1734, distanceFromStart: 0 },
          { lat: 41.3852, lon: 2.1735, distanceFromStart: 1.0 },
        ],
      };

      const result = generateGPXWithNutrition(noElevationTrack, [], 'Test Plan');

      expect(result).toContain('<trk>');
      // Should not include <ele> tags for points without elevation
      const eleMatches = result.match(/<ele>/g);
      expect(eleMatches).toBeNull();
    });

    it('should escape special XML characters in names', () => {
      const specialCharsWaypoint: NutritionWaypoint[] = [
        {
          latitude: 41.3851,
          longitude: 2.1734,
          trigger_distance_km: 1,
          nutrition_type: 'energy_gel',
          product_name: 'Gel <Energy> & "Power"',
        },
      ];

      const result = generateGPXWithNutrition(mockTrack, specialCharsWaypoint, 'Test & Plan');

      // XML should be escaped properly
      expect(result).not.toContain('Gel <Energy>');
      expect(result).toContain('&amp;'); // & should be escaped
    });

    it('should format description with all nutritional info', () => {
      const fullNutritionWaypoint: NutritionWaypoint[] = [
        {
          latitude: 41.3851,
          longitude: 2.1734,
          trigger_distance_km: 15,
          nutrition_type: 'solid_food',
          product_name: 'Barrita energética',
          calories: 200,
          carbs: 40,
          protein: 5,
          sodium_mg: 100,
          quantity: 1,
          quantity_unit: 'unidad',
          notes: 'Masticar bien',
        },
      ];

      const result = generateGPXWithNutrition(mockTrack, fullNutritionWaypoint, 'Test Plan');

      const desc = result.match(/<desc>(.*?)<\/desc>/s)?.[1] || '';
      expect(desc).toContain('200 kcal');
      expect(desc).toContain('40g carbs');
      expect(desc).toContain('5g prot');
      expect(desc).toContain('100mg Na');
      expect(desc).toContain('1unidad');
      expect(desc).toContain('Masticar bien');
    });
  });
});
