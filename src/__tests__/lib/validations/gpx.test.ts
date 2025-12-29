/**
 * GPX Validation Schemas Tests
 * Tests for Zod validation schemas for GPX plans and waypoints
 */
import { describe, it, expect } from 'vitest';
import {
  createGPXPlanSchema,
  updateGPXPlanSchema,
  createWaypointSchema,
  updateWaypointSchema,
  getWaypointsQuerySchema,
  deleteWaypointQuerySchema,
} from '@/lib/validations/gpx';

describe('GPX Validation Schemas', () => {
  describe('createGPXPlanSchema', () => {
    it('should validate valid plan data', () => {
      const validPlan = {
        name: 'Marathon Barcelona 2024',
        description: 'Plan de nutrición para el maratón',
        event_name: 'Maratón de Barcelona',
        event_date: '2024-12-25',
        sport_type: 'running' as const,
      };

      const result = createGPXPlanSchema.safeParse(validPlan);
      expect(result.success).toBe(true);
    });

    it('should validate minimal plan data', () => {
      const minimalPlan = {
        name: 'Simple Route',
      };

      const result = createGPXPlanSchema.safeParse(minimalPlan);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sport_type).toBe('running'); // Default value
      }
    });

    it('should require name field', () => {
      const noPlan = {};

      const result = createGPXPlanSchema.safeParse(noPlan);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod error message includes the word "expected"
        expect(result.error.issues[0].message).toMatch(/expected|required/i);
      }
    });

    it('should reject empty name', () => {
      const emptyName = { name: '' };

      const result = createGPXPlanSchema.safeParse(emptyName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required');
      }
    });

    it('should reject name longer than 200 characters', () => {
      const longName = { name: 'A'.repeat(201) };

      const result = createGPXPlanSchema.safeParse(longName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name too long');
      }
    });

    it('should accept name up to 200 characters', () => {
      const maxName = { name: 'A'.repeat(200) };

      const result = createGPXPlanSchema.safeParse(maxName);
      expect(result.success).toBe(true);
    });

    it('should reject description longer than 1000 characters', () => {
      const longDesc = {
        name: 'Test',
        description: 'A'.repeat(1001),
      };

      const result = createGPXPlanSchema.safeParse(longDesc);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Description too long');
      }
    });

    it('should reject event_name longer than 200 characters', () => {
      const longEventName = {
        name: 'Test',
        event_name: 'A'.repeat(201),
      };

      const result = createGPXPlanSchema.safeParse(longEventName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Event name too long');
      }
    });

    it('should validate date format (YYYY-MM-DD)', () => {
      const validDate = {
        name: 'Test',
        event_date: '2024-12-25',
      };

      const result = createGPXPlanSchema.safeParse(validDate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalidDate = {
        name: 'Test',
        event_date: '25-12-2024',
      };

      const result = createGPXPlanSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid date format (YYYY-MM-DD)');
      }
    });

    it('should accept all valid sport types', () => {
      const sportTypes = ['running', 'cycling', 'triathlon', 'hiking', 'other'];

      sportTypes.forEach((sportType) => {
        const plan = { name: 'Test', sport_type: sportType };
        const result = createGPXPlanSchema.safeParse(plan);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid sport type', () => {
      const invalidSport = {
        name: 'Test',
        sport_type: 'swimming',
      };

      const result = createGPXPlanSchema.safeParse(invalidSport);
      expect(result.success).toBe(false);
    });

    it('should default sport_type to running', () => {
      const plan = { name: 'Test' };

      const result = createGPXPlanSchema.safeParse(plan);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sport_type).toBe('running');
      }
    });
  });

  describe('updateGPXPlanSchema', () => {
    it('should validate partial update with name only', () => {
      const update = { name: 'Updated Name' };

      const result = updateGPXPlanSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate full update', () => {
      const update = {
        name: 'Updated',
        description: 'Updated description',
        event_name: 'Updated event',
        event_date: '2024-12-31',
        sport_type: 'cycling' as const,
        nutritionist_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = updateGPXPlanSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should accept empty update object', () => {
      const update = {};

      const result = updateGPXPlanSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate nutritionist_id as UUID', () => {
      const validUUID = {
        nutritionist_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = updateGPXPlanSchema.safeParse(validUUID);
      expect(result.success).toBe(true);
    });

    it('should reject invalid nutritionist_id UUID', () => {
      const invalidUUID = {
        nutritionist_id: 'not-a-uuid',
      };

      const result = updateGPXPlanSchema.safeParse(invalidUUID);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid nutritionist ID');
      }
    });

    it('should allow all fields to be optional', () => {
      const partialUpdate = {
        description: 'Only description updated',
      };

      const result = updateGPXPlanSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });
  });

  describe('createWaypointSchema', () => {
    it('should validate valid spatial waypoint with all fields', () => {
      const validWaypoint = {
        type: 'spatial' as const,
        latitude: 41.3851,
        longitude: 2.1734,
        elevation_m: 100,
        distance_from_start_km: 5.5,
        nutrition_type: 'energy_gel' as const,
        product_name: 'SIS Isotonic Gel',
        calories: 87,
        carbs: 22,
        protein: 0,
        fat: 0,
        sodium_mg: 75,
        caffeine_mg: 75,
        quantity: 1,
        quantity_unit: 'gel',
        notes: 'Tomar con agua',
        icon_symbol: 'Food',
        sort_order: 1,
      };

      const result = createWaypointSchema.safeParse(validWaypoint);
      expect(result.success).toBe(true);
    });

    it('should validate minimal spatial waypoint with distance', () => {
      const minimalWaypoint = {
        type: 'spatial' as const,
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: 5,
        nutrition_type: 'hydration' as const,
      };

      const result = createWaypointSchema.safeParse(minimalWaypoint);
      expect(result.success).toBe(true);
    });

    it('should validate temporal waypoint with time trigger', () => {
      const timeOnlyWaypoint = {
        type: 'temporal' as const,
        trigger_time_min: 30,
        nutrition_type: 'energy_gel' as const,
      };

      const result = createWaypointSchema.safeParse(timeOnlyWaypoint);
      expect(result.success).toBe(true);
    });

    it('should require type field', () => {
      const noType = {
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: 5,
        nutrition_type: 'energy_gel' as const,
      };

      const result = createWaypointSchema.safeParse(noType);
      expect(result.success).toBe(false);
    });

    it('should validate latitude range for spatial waypoints', () => {
      const invalidLat = {
        type: 'spatial' as const,
        latitude: 91, // Out of range
        longitude: 2.1734,
        distance_from_start_km: 5,
        nutrition_type: 'hydration' as const,
      };

      const result = createWaypointSchema.safeParse(invalidLat);
      expect(result.success).toBe(false);
    });

    it('should accept valid latitude range for spatial waypoints', () => {
      const validLatitudes = [-90, -45, 0, 45, 90];

      validLatitudes.forEach((lat) => {
        const waypoint = {
          type: 'spatial' as const,
          latitude: lat,
          longitude: 0,
          distance_from_start_km: 1,
          nutrition_type: 'hydration' as const,
        };
        const result = createWaypointSchema.safeParse(waypoint);
        expect(result.success).toBe(true);
      });
    });

    it('should validate longitude range for spatial waypoints', () => {
      const invalidLon = {
        type: 'spatial' as const,
        latitude: 41.3851,
        longitude: 181, // Out of range
        distance_from_start_km: 5,
        nutrition_type: 'hydration' as const,
      };

      const result = createWaypointSchema.safeParse(invalidLon);
      expect(result.success).toBe(false);
    });

    it('should accept valid longitude range for spatial waypoints', () => {
      const validLongitudes = [-180, -90, 0, 90, 180];

      validLongitudes.forEach((lon) => {
        const waypoint = {
          type: 'spatial' as const,
          latitude: 0,
          longitude: lon,
          distance_from_start_km: 1,
          nutrition_type: 'hydration' as const,
        };
        const result = createWaypointSchema.safeParse(waypoint);
        expect(result.success).toBe(true);
      });
    });

    it('should reject negative distance for spatial waypoints', () => {
      const negativeDist = {
        type: 'spatial' as const,
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: -5,
        nutrition_type: 'hydration' as const,
      };

      const result = createWaypointSchema.safeParse(negativeDist);
      expect(result.success).toBe(false);
    });

    it('should reject negative time for temporal waypoints', () => {
      const negativeTime = {
        type: 'temporal' as const,
        trigger_time_min: -30,
        nutrition_type: 'energy_gel' as const,
      };

      const result = createWaypointSchema.safeParse(negativeTime);
      expect(result.success).toBe(false);
    });

    it('should require trigger_time_min to be integer for temporal waypoints', () => {
      const floatTime = {
        type: 'temporal' as const,
        trigger_time_min: 30.5,
        nutrition_type: 'energy_gel' as const,
      };

      const result = createWaypointSchema.safeParse(floatTime);
      expect(result.success).toBe(false);
    });

    it('should accept all valid nutrition types', () => {
      const nutritionTypes = [
        'hydration',
        'isotonic_drink',
        'energy_gel',
        'solid_food',
        'salt_caps',
        'caffeine',
        'custom',
      ];

      nutritionTypes.forEach((type) => {
        const waypoint = {
          type: 'spatial' as const,
          latitude: 41.3851,
          longitude: 2.1734,
          distance_from_start_km: 5,
          nutrition_type: type,
        };
        const result = createWaypointSchema.safeParse(waypoint);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid nutrition type', () => {
      const invalidType = {
        type: 'spatial' as const,
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: 5,
        nutrition_type: 'invalid_type',
      };

      const result = createWaypointSchema.safeParse(invalidType);
      expect(result.success).toBe(false);
    });

    it('should reject negative calories', () => {
      const negativeCalories = {
        type: 'spatial' as const,
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: 5,
        nutrition_type: 'energy_gel' as const,
        calories: -100,
      };

      const result = createWaypointSchema.safeParse(negativeCalories);
      expect(result.success).toBe(false);
    });

    it('should require calories to be integer', () => {
      const floatCalories = {
        type: 'spatial' as const,
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: 5,
        nutrition_type: 'energy_gel' as const,
        calories: 87.5,
      };

      const result = createWaypointSchema.safeParse(floatCalories);
      expect(result.success).toBe(false);
    });

    it('should reject negative macros', () => {
      const negativeCarbs = {
        type: 'spatial' as const,
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: 5,
        nutrition_type: 'energy_gel' as const,
        carbs: -10,
      };

      const result = createWaypointSchema.safeParse(negativeCarbs);
      expect(result.success).toBe(false);
    });

    it('should validate product_name length', () => {
      const longProduct = {
        type: 'spatial' as const,
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: 5,
        nutrition_type: 'energy_gel' as const,
        product_name: 'A'.repeat(201),
      };

      const result = createWaypointSchema.safeParse(longProduct);
      expect(result.success).toBe(false);
    });

    it('should validate notes length', () => {
      const longNotes = {
        type: 'spatial' as const,
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: 5,
        nutrition_type: 'energy_gel' as const,
        notes: 'A'.repeat(1001),
      };

      const result = createWaypointSchema.safeParse(longNotes);
      expect(result.success).toBe(false);
    });
  });

  describe('updateWaypointSchema', () => {
    it('should validate partial update with waypoint_id', () => {
      const update = {
        waypoint_id: '123e4567-e89b-12d3-a456-426614174000',
        notes: 'Updated notes',
      };

      const result = updateWaypointSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate full nutritional update', () => {
      const update = {
        waypoint_id: '123e4567-e89b-12d3-a456-426614174000',
        nutrition_type: 'solid_food' as const,
        product_name: 'Barrita',
        calories: 200,
        carbs: 40,
        protein: 5,
        fat: 2,
        notes: 'New notes',
      };

      const result = updateWaypointSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should require waypoint_id', () => {
      const update = {
        notes: 'Updated notes',
      };

      const result = updateWaypointSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should allow updating only nutrition data', () => {
      const update = {
        waypoint_id: '123e4567-e89b-12d3-a456-426614174000',
        product_name: 'Updated Product',
        calories: 100,
      };

      const result = updateWaypointSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });

  describe('getWaypointsQuerySchema', () => {
    it('should validate valid UUID', () => {
      const query = {
        gpx_plan_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = getWaypointsQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const query = {
        gpx_plan_id: 'not-a-uuid',
      };

      const result = getWaypointsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid plan ID');
      }
    });

    it('should require gpx_plan_id', () => {
      const query = {};

      const result = getWaypointsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });

  describe('deleteWaypointQuerySchema', () => {
    it('should validate valid waypoint ID', () => {
      const query = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = deleteWaypointQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should reject invalid waypoint ID', () => {
      const query = {
        id: 'not-a-uuid',
      };

      const result = deleteWaypointQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid waypoint ID');
      }
    });

    it('should require id', () => {
      const query = {};

      const result = deleteWaypointQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });
});
