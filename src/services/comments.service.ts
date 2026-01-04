/**
 * Comments Service
 *
 * Handles nutritionist comments on entries and sessions.
 */

import { createApiClient, API_ENDPOINTS, ApiClient } from "./api-client";

// Types
export type CommentTargetType = "nutrition_entry" | "training_session";

export interface Comment {
  id: string;
  nutritionist_id: string;
  patient_id: string;
  target_type: CommentTargetType;
  target_id: string;
  target_date: string;
  content: string;
  created_at: string;
  updated_at: string;
  nutritionist?: {
    full_name: string;
    email: string;
  };
}

export interface CreateCommentData {
  patientId: string;
  targetType: CommentTargetType;
  targetId: string;
  targetDate: string;
  content: string;
}

export interface UpdateCommentData {
  content: string;
}

export interface GetCommentsOptions {
  patientId?: string;
  targetType?: CommentTargetType;
  targetId?: string;
  targetDate?: string;
}

/**
 * Create Comments Service instance
 */
export function createCommentsService(client: ApiClient) {
  return {
    /**
     * Get comments
     */
    async getComments(options: GetCommentsOptions = {}): Promise<Comment[]> {
      return client.get<Comment[]>(API_ENDPOINTS.COMMENTS, {
        params: {
          patientId: options.patientId,
          targetType: options.targetType,
          targetId: options.targetId,
          targetDate: options.targetDate,
        },
      });
    },

    /**
     * Get comments for a specific entry/session
     */
    async getCommentsForTarget(
      targetType: CommentTargetType,
      targetId: string
    ): Promise<Comment[]> {
      return client.get<Comment[]>(API_ENDPOINTS.COMMENTS, {
        params: { targetType, targetId },
      });
    },

    /**
     * Get comments for a date (all entries/sessions)
     */
    async getCommentsForDate(
      patientId: string,
      date: string
    ): Promise<Comment[]> {
      return client.get<Comment[]>(API_ENDPOINTS.COMMENTS, {
        params: { patientId, targetDate: date },
      });
    },

    /**
     * Create comment
     */
    async createComment(data: CreateCommentData): Promise<Comment> {
      return client.post<Comment>(API_ENDPOINTS.COMMENTS, {
        body: data,
      });
    },

    /**
     * Update comment
     */
    async updateComment(id: string, data: UpdateCommentData): Promise<Comment> {
      return client.patch<Comment>(`${API_ENDPOINTS.COMMENTS}/${id}`, {
        body: data,
      });
    },

    /**
     * Delete comment
     */
    async deleteComment(id: string): Promise<void> {
      return client.delete(`${API_ENDPOINTS.COMMENTS}/${id}`);
    },
  };
}

/**
 * Comments Service type
 */
export type CommentsService = ReturnType<typeof createCommentsService>;

/**
 * Create Comments Service with token
 */
export function getCommentsService(token?: string | null): CommentsService {
  return createCommentsService(createApiClient(token));
}
