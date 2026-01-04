"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logError } from "@/lib/client-logger";
import type { GPXTrackPoint } from "@/lib/gpx/parser";
import type { Waypoint } from "@/types/waypoint";

export interface GPXPlan {
  id: string;
  name: string;
  description?: string;
  total_distance_km?: number;
  total_elevation_gain_m?: number;
  total_elevation_loss_m?: number;
  estimated_duration_minutes?: number;
  event_date?: string;
  event_name?: string;
  sport_type: string;
  created_at: string;
}

interface UseGPXPlanDataOptions {
  planId: string;
}

interface UseGPXPlanDataReturn {
  // Data
  plan: GPXPlan | null;
  trackPoints: GPXTrackPoint[];
  waypoints: Waypoint[];

  // State
  isLoading: boolean;
  error: string;

  // Actions
  reload: () => Promise<void>;
  updatePlan: (updates: Partial<GPXPlan>) => void;
  setWaypoints: React.Dispatch<React.SetStateAction<Waypoint[]>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Custom hook for loading and managing GPX plan data
 * Extracts data fetching logic from GPXPlanViewer for better separation of concerns
 */
export function useGPXPlanData({ planId }: UseGPXPlanDataOptions): UseGPXPlanDataReturn {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [plan, setPlan] = useState<GPXPlan | null>(null);
  const [trackPoints, setTrackPoints] = useState<GPXTrackPoint[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  const loadPlanData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      // 1. Fetch plan metadata
      const planRes = await fetch(`/api/gpx-plans/${planId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!planRes.ok) {
        throw new Error("Failed to load plan");
      }

      const { data: planData } = await planRes.json();
      setPlan(planData);

      // 2. Fetch waypoints
      const waypointsRes = await fetch(`/api/gpx-plans/${planId}/waypoints`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (waypointsRes.ok) {
        const { data: waypointsData } = await waypointsRes.json();
        setWaypoints(waypointsData || []);
      }

      // 3. Fetch track points
      const trackRes = await fetch(`/api/gpx-plans/${planId}/track-data`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (trackRes.ok) {
        const { data: trackData } = await trackRes.json();
        setTrackPoints(trackData.trackPoints || []);
      }

    } catch (err) {
      logError("Failed to load GPX plan data", err, { planId });
      setError(err instanceof Error ? err.message : "Failed to load plan");
    } finally {
      setIsLoading(false);
    }
  }, [planId, token]);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  const updatePlan = useCallback((updates: Partial<GPXPlan>) => {
    setPlan(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  return {
    plan,
    trackPoints,
    waypoints,
    isLoading,
    error,
    reload: loadPlanData,
    updatePlan,
    setWaypoints,
    setError,
  };
}
