/**
 * Nutrition Service
 *
 * Handles all nutrition-related API operations.
 */

import { createApiClient, API_ENDPOINTS, ApiClient } from "./api-client";
import { Database } from "@/types/database";

// Types
type NutritionEntry = Database["public"]["Tables"]["nutrition_entries"]["Row"];
type NutritionImage = Database["public"]["Tables"]["nutrition_images"]["Row"];

export interface NutritionEntryWithImages extends NutritionEntry {
  nutrition_images?: (NutritionImage & { image_url: string })[];
}

export interface CreateEntryData {
  date: string;
  time?: string;
  meal_type: string;
  description?: string;
}

export interface UpdateEntryData {
  time?: string;
  meal_type?: string;
  description?: string;
}

export interface GetEntriesOptions {
  date?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetPatientEntriesOptions extends GetEntriesOptions {
  patientId: string;
}

/**
 * Create Nutrition Service instance
 */
export function createNutritionService(client: ApiClient) {
  return {
    /**
     * Get entries for current user
     */
    async getEntries(options: GetEntriesOptions = {}): Promise<NutritionEntryWithImages[]> {
      return client.get<NutritionEntryWithImages[]>(API_ENDPOINTS.NUTRITION_ENTRIES, {
        params: { ...options },
      });
    },

    /**
     * Get entries for a specific patient (nutritionist view)
     */
    async getPatientEntries(options: GetPatientEntriesOptions): Promise<NutritionEntryWithImages[]> {
      return client.get<NutritionEntryWithImages[]>(API_ENDPOINTS.NUTRITION_PATIENT_ENTRIES, {
        params: { ...options },
      });
    },

    /**
     * Get single entry by ID
     */
    async getEntry(id: string): Promise<NutritionEntryWithImages> {
      return client.get<NutritionEntryWithImages>(`${API_ENDPOINTS.NUTRITION_ENTRIES}/${id}`);
    },

    /**
     * Create new entry
     */
    async createEntry(data: CreateEntryData): Promise<NutritionEntry> {
      return client.post<NutritionEntry>(API_ENDPOINTS.NUTRITION_ENTRIES, {
        body: data,
      });
    },

    /**
     * Update entry
     */
    async updateEntry(id: string, data: UpdateEntryData): Promise<NutritionEntry> {
      return client.patch<NutritionEntry>(`${API_ENDPOINTS.NUTRITION_ENTRIES}/${id}`, {
        body: data,
      });
    },

    /**
     * Delete entry
     */
    async deleteEntry(id: string): Promise<void> {
      return client.delete(`${API_ENDPOINTS.NUTRITION_ENTRIES}/${id}`);
    },

    /**
     * Upload image for entry
     */
    async uploadImage(entryId: string, file: File): Promise<NutritionImage & { image_url: string }> {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entryId", entryId);

      return client.upload<NutritionImage & { image_url: string }>(
        API_ENDPOINTS.NUTRITION_UPLOAD,
        formData
      );
    },

    /**
     * Delete image
     */
    async deleteImage(imageId: string): Promise<void> {
      return client.delete(`/api/nutrition/images/${imageId}`);
    },
  };
}

/**
 * Nutrition Service type
 */
export type NutritionService = ReturnType<typeof createNutritionService>;

/**
 * Create Nutrition Service with token
 */
export function getNutritionService(token?: string | null): NutritionService {
  return createNutritionService(createApiClient(token));
}
