"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNutritionService,
  getTrainingService,
  getMealPlansService,
  getCommentsService,
  getGPXService,
} from "@/services";

/**
 * Hook to get NutritionService with auth token
 *
 * @example
 * ```tsx
 * const nutritionService = useNutritionService();
 * const entries = await nutritionService.getEntries({ date: "2024-01-15" });
 * ```
 */
export function useNutritionService() {
  const { token } = useAuth();
  return useMemo(() => getNutritionService(token), [token]);
}

/**
 * Hook to get TrainingService with auth token
 *
 * @example
 * ```tsx
 * const trainingService = useTrainingService();
 * const sessions = await trainingService.getSessions({ date: "2024-01-15" });
 * ```
 */
export function useTrainingService() {
  const { token } = useAuth();
  return useMemo(() => getTrainingService(token), [token]);
}

/**
 * Hook to get MealPlansService with auth token
 *
 * @example
 * ```tsx
 * const mealPlansService = useMealPlansService();
 * const plans = await mealPlansService.getPlans({ patientId });
 * ```
 */
export function useMealPlansService() {
  const { token } = useAuth();
  return useMemo(() => getMealPlansService(token), [token]);
}

/**
 * Hook to get CommentsService with auth token
 *
 * @example
 * ```tsx
 * const commentsService = useCommentsService();
 * const comments = await commentsService.getCommentsForDate(patientId, date);
 * ```
 */
export function useCommentsService() {
  const { token } = useAuth();
  return useMemo(() => getCommentsService(token), [token]);
}

/**
 * Hook to get GPXService with auth token
 *
 * @example
 * ```tsx
 * const gpxService = useGPXService();
 * const plans = await gpxService.getPlans();
 * const waypoints = await gpxService.getWaypoints(planId);
 * ```
 */
export function useGPXService() {
  const { token } = useAuth();
  return useMemo(() => getGPXService(token), [token]);
}
