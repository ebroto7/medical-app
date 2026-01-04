/**
 * Services - Centralized API abstraction layer
 *
 * This module provides type-safe services for all API operations,
 * eliminating duplicated fetch logic across components.
 *
 * Usage:
 * ```tsx
 * import { getNutritionService } from "@/services";
 *
 * function MyComponent() {
 *   const { token } = useAuth();
 *   const nutritionService = getNutritionService(token);
 *
 *   const loadEntries = async () => {
 *     const entries = await nutritionService.getEntries({ date: "2024-01-15" });
 *   };
 * }
 * ```
 *
 * Or with the useService hook pattern:
 * ```tsx
 * import { useNutritionService } from "@/hooks/useServices";
 *
 * function MyComponent() {
 *   const nutritionService = useNutritionService();
 *   // service already has token from context
 * }
 * ```
 */

// API Client
export { createApiClient, ApiError, API_ENDPOINTS } from "./api-client";
export type { ApiClient, ApiResponse } from "./api-client";

// Nutrition Service
export {
  createNutritionService,
  getNutritionService,
} from "./nutrition.service";
export type {
  NutritionService,
  NutritionEntryWithImages,
  CreateEntryData,
  UpdateEntryData,
  GetEntriesOptions,
  GetPatientEntriesOptions,
} from "./nutrition.service";

// Training Service
export {
  createTrainingService,
  getTrainingService,
} from "./training.service";
export type {
  TrainingService,
  TrainingType,
  CreateSessionData,
  UpdateSessionData,
  GetSessionsOptions,
  GetPatientSessionsOptions,
} from "./training.service";

// Meal Plans Service
export {
  createMealPlansService,
  getMealPlansService,
} from "./meal-plans.service";
export type {
  MealPlansService,
  MealPlanWithDetails,
  CreateWeeklyPlanData,
  CreateSituationalPlanData,
  UpdatePlanData,
  GetPlansOptions,
  MealPlanVersion,
} from "./meal-plans.service";

// Comments Service
export {
  createCommentsService,
  getCommentsService,
} from "./comments.service";
export type {
  CommentsService,
  Comment,
  CommentTargetType,
  CreateCommentData,
  UpdateCommentData,
  GetCommentsOptions,
} from "./comments.service";

// GPX Service
export {
  createGPXService,
  getGPXService,
} from "./gpx.service";
export type {
  GPXService,
  GPXPlan,
  GPXTrackPoint,
  GPXWaypoint,
  SpatialWaypoint,
  TemporalWaypointSingle,
  TemporalWaypointLoop,
  RepeatConfig,
  GPXSportType,
  WaypointType,
  CreateGPXPlanData,
  UpdateGPXPlanData,
  CreateWaypointData,
  CreateSpatialWaypointData,
  CreateTemporalWaypointData,
  CreateTemporalLoopData,
  UpdateWaypointData,
} from "./gpx.service";
