/**
 * Custom hooks for the application
 *
 * These hooks eliminate code duplication across components by providing
 * reusable patterns for async operations, data fetching, and state management.
 */

export { useAsync, useLazyAsync } from "./useAsync";
export { useFetch, useMutation, useDelete } from "./useFetch";
export { useGPXPlanData } from "./useGPXPlanData";
export type { GPXPlan } from "./useGPXPlanData";

// Service hooks - provide pre-configured services with auth token
export {
  useNutritionService,
  useTrainingService,
  useMealPlansService,
  useCommentsService,
  useGPXService,
} from "./useServices";
