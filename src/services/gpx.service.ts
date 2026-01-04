/**
 * GPX Plans Service
 *
 * Handles all GPX plan and waypoint API operations.
 */

import { createApiClient, API_ENDPOINTS, ApiClient } from "./api-client";

// Types
export type GPXSportType =
  | "running"
  | "trail_running"
  | "cycling"
  | "mtb"
  | "hiking"
  | "swimming"
  | "triathlon"
  | "other";

export type WaypointType = "spatial" | "temporal";

export interface GPXPlan {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  sport_type: GPXSportType;
  distance_km?: number;
  elevation_gain_m?: number;
  estimated_duration_min?: number;
  gpx_file_path?: string;
  created_at: string;
  updated_at: string;
}

export interface GPXTrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  distance_km: number;
}

export interface SpatialWaypoint {
  id: string;
  plan_id: string;
  type: "spatial";
  latitude: number;
  longitude: number;
  elevation_m?: number;
  distance_from_start_km: number;
  trigger_time_min?: null;
  is_repeating: false;
  repeat_config?: null;
  color?: string;
  nutrition_type?: string;
  product_name?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  sodium_mg?: number;
  caffeine_mg?: number;
  quantity?: number;
  quantity_unit?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TemporalWaypointSingle {
  id: string;
  plan_id: string;
  type: "temporal";
  trigger_time_min: number;
  latitude?: null;
  longitude?: null;
  elevation_m?: null;
  distance_from_start_km?: null;
  is_repeating: false;
  repeat_config?: null;
  color?: string;
  nutrition_type?: string;
  product_name?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  sodium_mg?: number;
  caffeine_mg?: number;
  quantity?: number;
  quantity_unit?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RepeatConfig {
  start_time_min: number;
  interval_min: number;
  repetitions: number;
}

export interface TemporalWaypointLoop {
  id: string;
  plan_id: string;
  type: "temporal";
  is_repeating: true;
  repeat_config: RepeatConfig;
  color: string;
  trigger_time_min?: null;
  latitude?: null;
  longitude?: null;
  elevation_m?: null;
  distance_from_start_km?: null;
  nutrition_type?: string;
  product_name?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  sodium_mg?: number;
  caffeine_mg?: number;
  quantity?: number;
  quantity_unit?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type GPXWaypoint = SpatialWaypoint | TemporalWaypointSingle | TemporalWaypointLoop;

export interface CreateGPXPlanData {
  name: string;
  description?: string;
  sport_type?: GPXSportType;
}

export interface UpdateGPXPlanData {
  name?: string;
  description?: string;
  sport_type?: GPXSportType;
  distance_km?: number;
  elevation_gain_m?: number;
  estimated_duration_min?: number;
}

export interface CreateSpatialWaypointData {
  type: "spatial";
  distance_from_start_km: number;
  latitude?: number;
  longitude?: number;
  elevation_m?: number;
  nutrition_type?: string;
  product_name?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  sodium_mg?: number;
  caffeine_mg?: number;
  quantity?: number;
  quantity_unit?: string;
  notes?: string;
}

export interface CreateTemporalWaypointData {
  type: "temporal";
  trigger_time_min: number;
  is_repeating?: false;
  nutrition_type?: string;
  product_name?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  sodium_mg?: number;
  caffeine_mg?: number;
  quantity?: number;
  quantity_unit?: string;
  notes?: string;
}

export interface CreateTemporalLoopData {
  type: "temporal";
  is_repeating: true;
  repeat_config: RepeatConfig;
  color: string;
  nutrition_type?: string;
  product_name?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  sodium_mg?: number;
  caffeine_mg?: number;
  quantity?: number;
  quantity_unit?: string;
  notes?: string;
}

export type CreateWaypointData =
  | CreateSpatialWaypointData
  | CreateTemporalWaypointData
  | CreateTemporalLoopData;

export interface UpdateWaypointData {
  waypoint_id: string;
  nutrition_type?: string;
  product_name?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  sodium_mg?: number;
  caffeine_mg?: number;
  quantity?: number;
  quantity_unit?: string;
  notes?: string;
  color?: string;
}

/**
 * Create GPX Service instance
 */
export function createGPXService(client: ApiClient) {
  return {
    /**
     * Get all GPX plans for current user
     */
    async getPlans(): Promise<GPXPlan[]> {
      return client.get<GPXPlan[]>(API_ENDPOINTS.GPX_PLANS);
    },

    /**
     * Get single GPX plan
     */
    async getPlan(id: string): Promise<GPXPlan> {
      return client.get<GPXPlan>(`${API_ENDPOINTS.GPX_PLANS}/${id}`);
    },

    /**
     * Create new GPX plan
     */
    async createPlan(data: CreateGPXPlanData): Promise<GPXPlan> {
      return client.post<GPXPlan>(API_ENDPOINTS.GPX_PLANS, {
        body: data,
      });
    },

    /**
     * Update GPX plan
     */
    async updatePlan(id: string, data: UpdateGPXPlanData): Promise<GPXPlan> {
      return client.patch<GPXPlan>(`${API_ENDPOINTS.GPX_PLANS}/${id}`, {
        body: data,
      });
    },

    /**
     * Delete GPX plan
     */
    async deletePlan(id: string): Promise<void> {
      return client.delete(`${API_ENDPOINTS.GPX_PLANS}/${id}`);
    },

    /**
     * Upload GPX file
     */
    async uploadGPXFile(planId: string, file: File): Promise<{ track_points: GPXTrackPoint[] }> {
      const formData = new FormData();
      formData.append("file", file);

      return client.upload<{ track_points: GPXTrackPoint[] }>(
        `${API_ENDPOINTS.GPX_PLANS}/${planId}/upload`,
        formData
      );
    },

    /**
     * Get track points for a plan
     */
    async getTrackPoints(planId: string): Promise<GPXTrackPoint[]> {
      return client.get<GPXTrackPoint[]>(`${API_ENDPOINTS.GPX_PLANS}/${planId}/track`);
    },

    /**
     * Get waypoints for a plan
     */
    async getWaypoints(planId: string): Promise<GPXWaypoint[]> {
      return client.get<GPXWaypoint[]>(`${API_ENDPOINTS.GPX_PLANS}/${planId}/waypoints`);
    },

    /**
     * Create waypoint
     */
    async createWaypoint(planId: string, data: CreateWaypointData): Promise<GPXWaypoint> {
      return client.post<GPXWaypoint>(`${API_ENDPOINTS.GPX_PLANS}/${planId}/waypoints`, {
        body: data,
      });
    },

    /**
     * Update waypoint
     */
    async updateWaypoint(planId: string, data: UpdateWaypointData): Promise<GPXWaypoint> {
      return client.patch<GPXWaypoint>(`${API_ENDPOINTS.GPX_PLANS}/${planId}/waypoints`, {
        body: data,
      });
    },

    /**
     * Delete waypoint
     */
    async deleteWaypoint(planId: string, waypointId: string): Promise<void> {
      return client.delete(`${API_ENDPOINTS.GPX_PLANS}/${planId}/waypoints`, {
        params: { waypoint_id: waypointId },
      });
    },

    /**
     * Export plan as GPX file
     */
    async exportAsGPX(planId: string): Promise<Blob> {
      const response = await fetch(
        `${API_ENDPOINTS.GPX_PLANS}/${planId}/export?format=gpx`,
        { headers: { Accept: "application/gpx+xml" } }
      );

      if (!response.ok) {
        throw new Error("Failed to export GPX");
      }

      return response.blob();
    },
  };
}

/**
 * GPX Service type
 */
export type GPXService = ReturnType<typeof createGPXService>;

/**
 * Create GPX Service with token
 */
export function getGPXService(token?: string | null): GPXService {
  return createGPXService(createApiClient(token));
}
