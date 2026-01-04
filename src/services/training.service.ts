/**
 * Training Service
 *
 * Handles all training session API operations.
 */

import { createApiClient, API_ENDPOINTS, ApiClient } from "./api-client";
import { Database } from "@/types/database";

// Types
type TrainingSession = Database["public"]["Tables"]["training_sessions"]["Row"];

export type TrainingType = "cardio" | "strength" | "flexibility" | "hiit" | "yoga" | "other";

export interface CreateSessionData {
  date: string;
  time: string;
  type: TrainingType;
  durationMinutes?: number;
  description?: string;
}

export interface UpdateSessionData {
  time?: string;
  type?: TrainingType;
  durationMinutes?: number;
  description?: string | null;
}

export interface GetSessionsOptions {
  date?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetPatientSessionsOptions extends GetSessionsOptions {
  patientId: string;
}

/**
 * Create Training Service instance
 */
export function createTrainingService(client: ApiClient) {
  return {
    /**
     * Get sessions for current user
     */
    async getSessions(options: GetSessionsOptions = {}): Promise<TrainingSession[]> {
      return client.get<TrainingSession[]>(API_ENDPOINTS.TRAINING_SESSIONS, {
        params: { ...options },
      });
    },

    /**
     * Get sessions for a specific patient (nutritionist view)
     */
    async getPatientSessions(options: GetPatientSessionsOptions): Promise<TrainingSession[]> {
      return client.get<TrainingSession[]>(API_ENDPOINTS.TRAINING_PATIENT_SESSIONS, {
        params: { ...options },
      });
    },

    /**
     * Create new session
     */
    async createSession(data: CreateSessionData): Promise<TrainingSession> {
      return client.post<TrainingSession>(API_ENDPOINTS.TRAINING_SESSIONS, {
        body: data,
      });
    },

    /**
     * Update session
     */
    async updateSession(id: string, data: UpdateSessionData): Promise<TrainingSession> {
      return client.put<TrainingSession>(`${API_ENDPOINTS.TRAINING_SESSIONS}/${id}`, {
        body: data,
      });
    },

    /**
     * Delete session
     */
    async deleteSession(id: string): Promise<void> {
      return client.delete(API_ENDPOINTS.TRAINING_SESSIONS, {
        params: { id },
      });
    },

    /**
     * Delete session by path (for [id] route)
     */
    async deleteSessionById(id: string): Promise<void> {
      return client.delete(`${API_ENDPOINTS.TRAINING_SESSIONS}/${id}`);
    },
  };
}

/**
 * Training Service type
 */
export type TrainingService = ReturnType<typeof createTrainingService>;

/**
 * Create Training Service with token
 */
export function getTrainingService(token?: string | null): TrainingService {
  return createTrainingService(createApiClient(token));
}
