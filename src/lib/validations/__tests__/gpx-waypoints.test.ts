import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';

// These schemas will be implemented in gpx.ts
// Import placeholder - update paths when schemas are created
import {
  createSpatialWaypointSchema,
  createTemporalWaypointSchema,
  createTemporalLoopSchema,
  createWaypointSchema,
  updateWaypointSchema,
} from '../gpx';

describe('Spatial Waypoint Validation', () => {
  describe('createSpatialWaypointSchema', () => {
    it('should validate valid spatial waypoint', () => {
      const validSpatialWaypoint = {
        type: 'spatial',
        latitude: 41.3851,
        longitude: 2.1734,
        elevation_m: 100.5,
        distance_from_start_km: 15.5,
        nutrition_type: 'energy_gel',
        product_name: 'Maurten Gel 100',
        calories: 100,
        carbs: 25,
      };

      const result = createSpatialWaypointSchema.safeParse(validSpatialWaypoint);
      expect(result.success).toBe(true);
    });

    it('should validate spatial waypoint without optional fields', () => {
      const minimalSpatialWaypoint = {
        type: 'spatial',
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: 15.5,
        nutrition_type: 'hydration',
      };

      const result = createSpatialWaypointSchema.safeParse(minimalSpatialWaypoint);
      expect(result.success).toBe(true);
    });

    it('should reject spatial waypoint with invalid latitude (> 90)', () => {
      const invalidWaypoint = {
        type: 'spatial',
        latitude: 91,
        longitude: 2.1734,
        distance_from_start_km: 15.5,
        nutrition_type: 'energy_gel',
      };

      const result = createSpatialWaypointSchema.safeParse(invalidWaypoint);
      expect(result.success).toBe(false);
    });

    it('should reject spatial waypoint with invalid latitude (< -90)', () => {
      const invalidWaypoint = {
        type: 'spatial',
        latitude: -91,
        longitude: 2.1734,
        distance_from_start_km: 15.5,
        nutrition_type: 'energy_gel',
      };

      const result = createSpatialWaypointSchema.safeParse(invalidWaypoint);
      expect(result.success).toBe(false);
    });

    it('should reject spatial waypoint with invalid longitude (> 180)', () => {
      const invalidWaypoint = {
        type: 'spatial',
        latitude: 41.3851,
        longitude: 181,
        distance_from_start_km: 15.5,
        nutrition_type: 'energy_gel',
      };

      const result = createSpatialWaypointSchema.safeParse(invalidWaypoint);
      expect(result.success).toBe(false);
    });

    it('should reject spatial waypoint with negative distance', () => {
      const invalidWaypoint = {
        type: 'spatial',
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: -5,
        nutrition_type: 'energy_gel',
      };

      const result = createSpatialWaypointSchema.safeParse(invalidWaypoint);
      expect(result.success).toBe(false);
    });

    it('should reject spatial waypoint with missing required fields', () => {
      const invalidWaypoint = {
        type: 'spatial',
        nutrition_type: 'energy_gel',
        // Missing latitude, longitude, distance_from_start_km
      };

      const result = createSpatialWaypointSchema.safeParse(invalidWaypoint);
      expect(result.success).toBe(false);
    });

    it('should reject spatial waypoint with temporal fields', () => {
      const invalidWaypoint = {
        type: 'spatial',
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: 15.5,
        nutrition_type: 'energy_gel',
        trigger_time_min: 60, // Should not be allowed for spatial
      };

      const result = createSpatialWaypointSchema.safeParse(invalidWaypoint);
      expect(result.success).toBe(false);
    });
  });
});

describe('Temporal Waypoint Single Validation', () => {
  describe('createTemporalWaypointSchema', () => {
    it('should validate valid temporal waypoint', () => {
      const validTemporalWaypoint = {
        type: 'temporal',
        trigger_time_min: 60,
        nutrition_type: 'hydration',
        product_name: 'Water',
        quantity: 500,
        quantity_unit: 'ml',
      };

      const result = createTemporalWaypointSchema.safeParse(validTemporalWaypoint);
      expect(result.success).toBe(true);
    });

    it('should validate temporal waypoint at time 0 (start)', () => {
      const waypoint = {
        type: 'temporal',
        trigger_time_min: 0,
        nutrition_type: 'isotonic_drink',
      };

      const result = createTemporalWaypointSchema.safeParse(waypoint);
      expect(result.success).toBe(true);
    });

    it('should validate temporal waypoint at max time (1440 min = 24 hours)', () => {
      const waypoint = {
        type: 'temporal',
        trigger_time_min: 1440,
        nutrition_type: 'energy_gel',
      };

      const result = createTemporalWaypointSchema.safeParse(waypoint);
      expect(result.success).toBe(true);
    });

    it('should reject temporal waypoint with negative time', () => {
      const invalidWaypoint = {
        type: 'temporal',
        trigger_time_min: -10,
        nutrition_type: 'hydration',
      };

      const result = createTemporalWaypointSchema.safeParse(invalidWaypoint);
      expect(result.success).toBe(false);
    });

    it('should reject temporal waypoint with time > 1440', () => {
      const invalidWaypoint = {
        type: 'temporal',
        trigger_time_min: 1441,
        nutrition_type: 'hydration',
      };

      const result = createTemporalWaypointSchema.safeParse(invalidWaypoint);
      expect(result.success).toBe(false);
    });

    it('should reject temporal waypoint with spatial fields', () => {
      const invalidWaypoint = {
        type: 'temporal',
        trigger_time_min: 60,
        nutrition_type: 'hydration',
        latitude: 41.3851, // Should not be allowed for temporal
        longitude: 2.1734,
      };

      const result = createTemporalWaypointSchema.safeParse(invalidWaypoint);
      expect(result.success).toBe(false);
    });

    it('should reject temporal waypoint with is_repeating=true (should use loop schema)', () => {
      const invalidWaypoint = {
        type: 'temporal',
        trigger_time_min: 60,
        nutrition_type: 'hydration',
        is_repeating: true, // Should use createTemporalLoopSchema instead
      };

      const result = createTemporalWaypointSchema.safeParse(invalidWaypoint);
      expect(result.success).toBe(false);
    });
  });
});

describe('Temporal Loop Validation', () => {
  describe('createTemporalLoopSchema', () => {
    it('should validate valid temporal loop', () => {
      const validLoop = {
        type: 'temporal',
        is_repeating: true,
        repeat_config: {
          start_time_min: 60,
          interval_min: 30,
          repetitions: 5,
        },
        color: '#3b82f6',
        nutrition_type: 'isotonic_drink',
        product_name: 'Maurten Drink',
      };

      const result = createTemporalLoopSchema.safeParse(validLoop);
      expect(result.success).toBe(true);
    });

    it('should reject loop without color', () => {
      const invalidLoop = {
        type: 'temporal',
        is_repeating: true,
        repeat_config: {
          start_time_min: 60,
          interval_min: 30,
          repetitions: 5,
        },
        nutrition_type: 'isotonic_drink',
        // Missing required color field
      };

      const result = createTemporalLoopSchema.safeParse(invalidLoop);
      expect(result.success).toBe(false);
    });

    it('should reject loop with invalid color format', () => {
      const invalidLoop = {
        type: 'temporal',
        is_repeating: true,
        repeat_config: {
          start_time_min: 60,
          interval_min: 30,
          repetitions: 5,
        },
        color: 'blue', // Should be hex format
        nutrition_type: 'isotonic_drink',
      };

      const result = createTemporalLoopSchema.safeParse(invalidLoop);
      expect(result.success).toBe(false);
    });

    it('should reject loop with invalid hex color (missing #)', () => {
      const invalidLoop = {
        type: 'temporal',
        is_repeating: true,
        repeat_config: {
          start_time_min: 60,
          interval_min: 30,
          repetitions: 5,
        },
        color: '3b82f6', // Missing # prefix
        nutrition_type: 'isotonic_drink',
      };

      const result = createTemporalLoopSchema.safeParse(invalidLoop);
      expect(result.success).toBe(false);
    });

    it('should reject loop without repeat_config', () => {
      const invalidLoop = {
        type: 'temporal',
        is_repeating: true,
        color: '#3b82f6',
        nutrition_type: 'isotonic_drink',
        // Missing repeat_config
      };

      const result = createTemporalLoopSchema.safeParse(invalidLoop);
      expect(result.success).toBe(false);
    });

    it('should reject loop with invalid repeat_config (negative start_time)', () => {
      const invalidLoop = {
        type: 'temporal',
        is_repeating: true,
        repeat_config: {
          start_time_min: -10,
          interval_min: 30,
          repetitions: 5,
        },
        color: '#3b82f6',
        nutrition_type: 'isotonic_drink',
      };

      const result = createTemporalLoopSchema.safeParse(invalidLoop);
      expect(result.success).toBe(false);
    });

    it('should reject loop with interval_min < 1', () => {
      const invalidLoop = {
        type: 'temporal',
        is_repeating: true,
        repeat_config: {
          start_time_min: 60,
          interval_min: 0,
          repetitions: 5,
        },
        color: '#3b82f6',
        nutrition_type: 'isotonic_drink',
      };

      const result = createTemporalLoopSchema.safeParse(invalidLoop);
      expect(result.success).toBe(false);
    });

    it('should reject loop with interval_min > 480 (8 hours)', () => {
      const invalidLoop = {
        type: 'temporal',
        is_repeating: true,
        repeat_config: {
          start_time_min: 60,
          interval_min: 481,
          repetitions: 5,
        },
        color: '#3b82f6',
        nutrition_type: 'isotonic_drink',
      };

      const result = createTemporalLoopSchema.safeParse(invalidLoop);
      expect(result.success).toBe(false);
    });

    it('should reject loop with repetitions < 1', () => {
      const invalidLoop = {
        type: 'temporal',
        is_repeating: true,
        repeat_config: {
          start_time_min: 60,
          interval_min: 30,
          repetitions: 0,
        },
        color: '#3b82f6',
        nutrition_type: 'isotonic_drink',
      };

      const result = createTemporalLoopSchema.safeParse(invalidLoop);
      expect(result.success).toBe(false);
    });

    it('should reject loop with repetitions > 50', () => {
      const invalidLoop = {
        type: 'temporal',
        is_repeating: true,
        repeat_config: {
          start_time_min: 60,
          interval_min: 30,
          repetitions: 51,
        },
        color: '#3b82f6',
        nutrition_type: 'isotonic_drink',
      };

      const result = createTemporalLoopSchema.safeParse(invalidLoop);
      expect(result.success).toBe(false);
    });
  });
});

describe('Discriminated Union Validation', () => {
  describe('createWaypointSchema', () => {
    it('should validate spatial waypoint', () => {
      const spatialWaypoint = {
        type: 'spatial',
        latitude: 41.3851,
        longitude: 2.1734,
        distance_from_start_km: 15.5,
        nutrition_type: 'energy_gel',
      };

      const result = createWaypointSchema.safeParse(spatialWaypoint);
      expect(result.success).toBe(true);
    });

    it('should validate temporal single waypoint', () => {
      const temporalWaypoint = {
        type: 'temporal',
        trigger_time_min: 60,
        nutrition_type: 'hydration',
      };

      const result = createWaypointSchema.safeParse(temporalWaypoint);
      expect(result.success).toBe(true);
    });

    it('should validate temporal loop waypoint', () => {
      const loopWaypoint = {
        type: 'temporal',
        is_repeating: true,
        repeat_config: {
          start_time_min: 60,
          interval_min: 30,
          repetitions: 5,
        },
        color: '#3b82f6',
        nutrition_type: 'isotonic_drink',
      };

      const result = createWaypointSchema.safeParse(loopWaypoint);
      expect(result.success).toBe(true);
    });

    it('should reject waypoint with invalid type', () => {
      const invalidWaypoint = {
        type: 'invalid_type',
        nutrition_type: 'hydration',
      };

      const result = createWaypointSchema.safeParse(invalidWaypoint);
      expect(result.success).toBe(false);
    });
  });
});

describe('Update Waypoint Validation', () => {
  describe('updateWaypointSchema', () => {
    it('should validate partial update', () => {
      const updateData = {
        waypoint_id: '123e4567-e89b-12d3-a456-426614174000',
        product_name: 'Updated Product',
        calories: 150,
      };

      const result = updateWaypointSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it('should validate update with single field', () => {
      const updateData = {
        waypoint_id: '123e4567-e89b-12d3-a456-426614174000',
        notes: 'Updated notes',
      };

      const result = updateWaypointSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it('should reject update without waypoint_id', () => {
      const updateData = {
        product_name: 'Updated Product',
      };

      const result = updateWaypointSchema.safeParse(updateData);
      expect(result.success).toBe(false);
    });

    it('should reject update with invalid UUID format', () => {
      const updateData = {
        waypoint_id: 'not-a-valid-uuid',
        product_name: 'Updated Product',
      };

      const result = updateWaypointSchema.safeParse(updateData);
      expect(result.success).toBe(false);
    });

    it('should reject update trying to change type', () => {
      const updateData = {
        waypoint_id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'temporal', // Not allowed to change type
      };

      const result = updateWaypointSchema.safeParse(updateData);
      expect(result.success).toBe(false);
    });

    it('should validate color update with valid hex', () => {
      const updateData = {
        waypoint_id: '123e4567-e89b-12d3-a456-426614174000',
        color: '#ff5733',
      };

      const result = updateWaypointSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it('should reject color update with invalid hex', () => {
      const updateData = {
        waypoint_id: '123e4567-e89b-12d3-a456-426614174000',
        color: 'red',
      };

      const result = updateWaypointSchema.safeParse(updateData);
      expect(result.success).toBe(false);
    });
  });
});

describe('Nutrition Type Validation', () => {
  it('should accept all valid nutrition types', () => {
    const validTypes = [
      'hydration',
      'isotonic_drink',
      'energy_gel',
      'solid_food',
      'salt_caps',
      'caffeine',
      'custom',
    ];

    validTypes.forEach((nutritionType) => {
      const waypoint = {
        type: 'temporal',
        trigger_time_min: 60,
        nutrition_type: nutritionType,
      };

      const result = createTemporalWaypointSchema.safeParse(waypoint);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid nutrition type', () => {
    const waypoint = {
      type: 'temporal',
      trigger_time_min: 60,
      nutrition_type: 'invalid_type',
    };

    const result = createTemporalWaypointSchema.safeParse(waypoint);
    expect(result.success).toBe(false);
  });
});
