/**
 * Meal Plans Service
 *
 * Handles all meal plan API operations.
 */

import { createApiClient, API_ENDPOINTS, ApiClient } from "./api-client";
import { Database } from "@/types/database";

// Types
type MealPlan = Database["public"]["Tables"]["meal_plans"]["Row"];
type MealPlanType = Database["public"]["Enums"]["meal_plan_type"];

export interface MealPlanWithDetails extends MealPlan {
  nutritionist?: {
    full_name: string;
    email: string;
  };
  version?: number;
  versions_count?: number;
}

export interface CreateWeeklyPlanData {
  patientId: string;
  name: string;
  description?: string;
  content: {
    days: Record<string, {
      meals: {
        type: string;
        name: string;
        description?: string;
        time?: string;
      }[];
    }>;
  };
}

export interface CreateSituationalPlanData {
  patientId: string;
  name: string;
  description?: string;
  content: {
    situation: string;
    recommendations: string[];
    meals?: {
      type: string;
      name: string;
      description?: string;
    }[];
  };
}

export interface UpdatePlanData {
  name?: string;
  description?: string;
  content?: unknown;
  is_active?: boolean;
}

export interface GetPlansOptions {
  patientId?: string;
  type?: MealPlanType;
  active?: boolean;
}

export interface MealPlanVersion {
  version: number;
  content: unknown;
  created_at: string;
  change_summary?: string;
}

/**
 * Create Meal Plans Service instance
 */
export function createMealPlansService(client: ApiClient) {
  return {
    /**
     * Get meal plans for patient
     */
    async getPlans(options: GetPlansOptions = {}): Promise<MealPlanWithDetails[]> {
      return client.get<MealPlanWithDetails[]>(API_ENDPOINTS.MEAL_PLANS, {
        params: { ...options },
      });
    },

    /**
     * Get single meal plan
     */
    async getPlan(id: string): Promise<MealPlanWithDetails> {
      return client.get<MealPlanWithDetails>(`${API_ENDPOINTS.MEAL_PLANS}/${id}`);
    },

    /**
     * Create weekly meal plan
     */
    async createWeeklyPlan(data: CreateWeeklyPlanData): Promise<MealPlan> {
      return client.post<MealPlan>(API_ENDPOINTS.MEAL_PLANS, {
        body: {
          ...data,
          type: "weekly",
        },
      });
    },

    /**
     * Create situational meal plan
     */
    async createSituationalPlan(data: CreateSituationalPlanData): Promise<MealPlan> {
      return client.post<MealPlan>(API_ENDPOINTS.MEAL_PLANS, {
        body: {
          ...data,
          type: "situational",
        },
      });
    },

    /**
     * Update meal plan
     */
    async updatePlan(id: string, data: UpdatePlanData): Promise<MealPlan> {
      return client.patch<MealPlan>(`${API_ENDPOINTS.MEAL_PLANS}/${id}`, {
        body: data,
      });
    },

    /**
     * Delete meal plan
     */
    async deletePlan(id: string): Promise<void> {
      return client.delete(`${API_ENDPOINTS.MEAL_PLANS}/${id}`);
    },

    /**
     * Get version history for a meal plan
     */
    async getVersions(planId: string): Promise<MealPlanVersion[]> {
      return client.get<MealPlanVersion[]>(`${API_ENDPOINTS.MEAL_PLANS}/${planId}/versions`);
    },

    /**
     * Restore a specific version
     */
    async restoreVersion(planId: string, version: number): Promise<MealPlan> {
      return client.post<MealPlan>(`${API_ENDPOINTS.MEAL_PLANS}/${planId}/versions/${version}/restore`);
    },
  };
}

/**
 * Meal Plans Service type
 */
export type MealPlansService = ReturnType<typeof createMealPlansService>;

/**
 * Create Meal Plans Service with token
 */
export function getMealPlansService(token?: string | null): MealPlansService {
  return createMealPlansService(createApiClient(token));
}
