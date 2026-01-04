import { describe, it, expect } from 'vitest';
import {
  isSpatialWaypoint,
  isTemporalWaypoint,
  isRepeatingWaypoint,
  expandTemporalLoop,
  type SpatialWaypoint,
  type TemporalWaypointSingle,
  type TemporalWaypointLoop,
} from '../waypoint';

describe('Waypoint Type Guards', () => {
  describe('isSpatialWaypoint', () => {
    it('should return true for spatial waypoints', () => {
      const spatialWaypoint: SpatialWaypoint = {
        id: '1',
        plan_id: 'plan-1',
        type: 'spatial',
        latitude: 41.3851,
        longitude: 2.1734,
        elevation_m: 100,
        distance_from_start_km: 15.5,
        trigger_time_min: null,
        is_repeating: false,
        repeat_config: null,
        name: 'Energy Gel',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(isSpatialWaypoint(spatialWaypoint)).toBe(true);
    });

    it('should return false for temporal waypoints', () => {
      const temporalWaypoint: TemporalWaypointSingle = {
        id: '2',
        plan_id: 'plan-1',
        type: 'temporal',
        latitude: null,
        longitude: null,
        elevation_m: null,
        distance_from_start_km: null,
        trigger_time_min: 60,
        is_repeating: false,
        repeat_config: null,
        name: 'Hydration',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(isSpatialWaypoint(temporalWaypoint)).toBe(false);
    });
  });

  describe('isTemporalWaypoint', () => {
    it('should return true for temporal single waypoints', () => {
      const temporalWaypoint: TemporalWaypointSingle = {
        id: '2',
        plan_id: 'plan-1',
        type: 'temporal',
        latitude: null,
        longitude: null,
        elevation_m: null,
        distance_from_start_km: null,
        trigger_time_min: 60,
        is_repeating: false,
        repeat_config: null,
        name: 'Hydration',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(isTemporalWaypoint(temporalWaypoint)).toBe(true);
    });

    it('should return true for temporal loop waypoints', () => {
      const loopWaypoint: TemporalWaypointLoop = {
        id: '3',
        plan_id: 'plan-1',
        type: 'temporal',
        latitude: null,
        longitude: null,
        elevation_m: null,
        distance_from_start_km: null,
        trigger_time_min: null,
        is_repeating: true,
        repeat_config: {
          start_time_min: 60,
          interval_min: 30,
          repetitions: 5,
        },
        color: '#3b82f6',
        name: 'Isotonic Drink',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(isTemporalWaypoint(loopWaypoint)).toBe(true);
    });

    it('should return false for spatial waypoints', () => {
      const spatialWaypoint: SpatialWaypoint = {
        id: '1',
        plan_id: 'plan-1',
        type: 'spatial',
        latitude: 41.3851,
        longitude: 2.1734,
        elevation_m: 100,
        distance_from_start_km: 15.5,
        trigger_time_min: null,
        is_repeating: false,
        repeat_config: null,
        name: 'Energy Gel',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(isTemporalWaypoint(spatialWaypoint)).toBe(false);
    });
  });

  describe('isRepeatingWaypoint', () => {
    it('should return true for repeating temporal waypoints', () => {
      const loopWaypoint: TemporalWaypointLoop = {
        id: '3',
        plan_id: 'plan-1',
        type: 'temporal',
        latitude: null,
        longitude: null,
        elevation_m: null,
        distance_from_start_km: null,
        trigger_time_min: null,
        is_repeating: true,
        repeat_config: {
          start_time_min: 60,
          interval_min: 30,
          repetitions: 5,
        },
        color: '#3b82f6',
        name: 'Isotonic Drink',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(isRepeatingWaypoint(loopWaypoint)).toBe(true);
    });

    it('should return false for non-repeating waypoints', () => {
      const temporalWaypoint: TemporalWaypointSingle = {
        id: '2',
        plan_id: 'plan-1',
        type: 'temporal',
        latitude: null,
        longitude: null,
        elevation_m: null,
        distance_from_start_km: null,
        trigger_time_min: 60,
        is_repeating: false,
        repeat_config: null,
        name: 'Hydration',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(isRepeatingWaypoint(temporalWaypoint)).toBe(false);
    });

    it('should return false for spatial waypoints', () => {
      const spatialWaypoint: SpatialWaypoint = {
        id: '1',
        plan_id: 'plan-1',
        type: 'spatial',
        latitude: 41.3851,
        longitude: 2.1734,
        elevation_m: 100,
        distance_from_start_km: 15.5,
        trigger_time_min: null,
        is_repeating: false,
        repeat_config: null,
        name: 'Energy Gel',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(isRepeatingWaypoint(spatialWaypoint)).toBe(false);
    });
  });
});

describe('expandTemporalLoop', () => {
  it('should expand loop with start_time=60, interval=30, repetitions=5', () => {
    const loopWaypoint: TemporalWaypointLoop = {
      id: 'loop-1',
      plan_id: 'plan-1',
      type: 'temporal',
      latitude: null,
      longitude: null,
      elevation_m: null,
      distance_from_start_km: null,
      trigger_time_min: null,
      is_repeating: true,
      repeat_config: {
        start_time_min: 60,
        interval_min: 30,
        repetitions: 5,
      },
      color: '#3b82f6',
      name: 'Isotonic Drink',
      product_name: 'Maurten Drink Mix',
      created_at: '2025-01-01T00:00:00Z',
    };

    const expanded = expandTemporalLoop(loopWaypoint);

    expect(expanded).toHaveLength(5);
    expect(expanded[0].time).toBe(60);
    expect(expanded[1].time).toBe(90);
    expect(expanded[2].time).toBe(120);
    expect(expanded[3].time).toBe(150);
    expect(expanded[4].time).toBe(180);

    // All expanded items should have same waypoint data
    expanded.forEach((item) => {
      expect(item.id).toBe('loop-1');
      expect(item.product_name).toBe('Maurten Drink Mix');
      expect(item.color).toBe('#3b82f6');
      expect(item.name).toBe('Isotonic Drink');
    });
  });

  it('should expand loop with start_time=0, interval=20, repetitions=3', () => {
    const loopWaypoint: TemporalWaypointLoop = {
      id: 'loop-2',
      plan_id: 'plan-1',
      type: 'temporal',
      latitude: null,
      longitude: null,
      elevation_m: null,
      distance_from_start_km: null,
      trigger_time_min: null,
      is_repeating: true,
      repeat_config: {
        start_time_min: 0,
        interval_min: 20,
        repetitions: 3,
      },
      color: '#ff5733',
      name: 'Hydration',
      created_at: '2025-01-01T00:00:00Z',
    };

    const expanded = expandTemporalLoop(loopWaypoint);

    expect(expanded).toHaveLength(3);
    expect(expanded[0].time).toBe(0);
    expect(expanded[1].time).toBe(20);
    expect(expanded[2].time).toBe(40);
  });

  it('should expand loop with single repetition', () => {
    const loopWaypoint: TemporalWaypointLoop = {
      id: 'loop-3',
      plan_id: 'plan-1',
      type: 'temporal',
      latitude: null,
      longitude: null,
      elevation_m: null,
      distance_from_start_km: null,
      trigger_time_min: null,
      is_repeating: true,
      repeat_config: {
        start_time_min: 120,
        interval_min: 45,
        repetitions: 1,
      },
      color: '#00ff00',
      name: 'Energy Gel',
      created_at: '2025-01-01T00:00:00Z',
    };

    const expanded = expandTemporalLoop(loopWaypoint);

    expect(expanded).toHaveLength(1);
    expect(expanded[0].time).toBe(120);
  });

  it('should handle large interval (e.g., hourly)', () => {
    const loopWaypoint: TemporalWaypointLoop = {
      id: 'loop-4',
      plan_id: 'plan-1',
      type: 'temporal',
      latitude: null,
      longitude: null,
      elevation_m: null,
      distance_from_start_km: null,
      trigger_time_min: null,
      is_repeating: true,
      repeat_config: {
        start_time_min: 60,
        interval_min: 60,
        repetitions: 4,
      },
      color: '#ffff00',
      name: 'Salt Caps',
      created_at: '2025-01-01T00:00:00Z',
    };

    const expanded = expandTemporalLoop(loopWaypoint);

    expect(expanded).toHaveLength(4);
    expect(expanded[0].time).toBe(60);  // 1 hour
    expect(expanded[1].time).toBe(120); // 2 hours
    expect(expanded[2].time).toBe(180); // 3 hours
    expect(expanded[3].time).toBe(240); // 4 hours
  });

  it('should preserve all waypoint properties in expanded items', () => {
    const loopWaypoint: TemporalWaypointLoop = {
      id: 'loop-5',
      plan_id: 'plan-1',
      type: 'temporal',
      latitude: null,
      longitude: null,
      elevation_m: null,
      distance_from_start_km: null,
      trigger_time_min: null,
      is_repeating: true,
      repeat_config: {
        start_time_min: 30,
        interval_min: 15,
        repetitions: 2,
      },
      color: '#ff00ff',
      name: 'Energy Gel',
      product_name: 'Test Gel',
      calories: 100,
      carbs: 25,
      protein: 0,
      fat: 0,
      sodium_mg: 50,
      caffeine_mg: 0,
      quantity: 1,
      quantity_unit: 'sachet',
      notes: 'Test notes',
      created_at: '2025-01-01T00:00:00Z',
    };

    const expanded = expandTemporalLoop(loopWaypoint);

    expect(expanded).toHaveLength(2);

    // Check first expanded item has all properties
    expect(expanded[0]).toMatchObject({
      time: 30,
      id: 'loop-5',
      plan_id: 'plan-1',
      type: 'temporal',
      color: '#ff00ff',
      name: 'Energy Gel',
      product_name: 'Test Gel',
      calories: 100,
      carbs: 25,
      sodium_mg: 50,
      quantity: 1,
      quantity_unit: 'sachet',
      notes: 'Test notes',
    });

    // Check second expanded item
    expect(expanded[1]).toMatchObject({
      time: 45,
      id: 'loop-5',
      product_name: 'Test Gel',
    });
  });
});
