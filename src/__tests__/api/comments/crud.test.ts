/**
 * Tests for Comments API (CRUD)
 *
 * Tests role-based access control:
 * - Only nutritionists can create/edit/delete comments
 * - Only connected nutritionists can comment on patient data
 * - Only comment authors can edit/delete their own comments
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, PUT, DELETE } from "@/app/api/comments/route";

// Mock dependencies
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth/api-helpers", () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  canAccessPatientData: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ success: true, headers: {} })),
}));

vi.mock("@/services/audit.service", () => ({
  auditSuccess: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole, canAccessPatientData } from "@/lib/auth/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { RoleError, AuthenticationError } from "@/lib/auth/errors";

describe("Comments API", () => {
  let mockSupabase: any;

  // Use valid UUIDs for testing
  const VALID_ENTRY_ID = "123e4567-e89b-12d3-a456-426614174000";
  const VALID_COMMENT_ID = "123e4567-e89b-12d3-a456-426614174001";
  const PATIENT_ID = "123e4567-e89b-12d3-a456-426614174002";
  const NUTRITIONIST_ID = "123e4567-e89b-12d3-a456-426614174003";

  function createMockSupabase() {
    const selectResult = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { user_id: PATIENT_ID }, error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const insertResult = {
      select: vi.fn().mockResolvedValue({
        data: [{ id: VALID_COMMENT_ID, nutritionist_id: NUTRITIONIST_ID, comment: "Test" }],
        error: null,
      }),
    };

    const updateResult = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [{ id: VALID_COMMENT_ID, comment: "Updated" }],
        error: null,
      }),
    };

    const deleteResult = {
      eq: vi.fn().mockReturnThis(),
    };

    return {
      from: vi.fn((table) => ({
        select: vi.fn().mockReturnValue(selectResult),
        insert: vi.fn().mockReturnValue(insertResult),
        update: vi.fn().mockReturnValue(updateResult),
        delete: vi.fn().mockReturnValue({
          ...deleteResult,
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      })),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(requireAuth).mockResolvedValue({ id: NUTRITIONIST_ID, email: "test@example.com" });
    vi.mocked(requireRole).mockResolvedValue(undefined);
    vi.mocked(canAccessPatientData).mockResolvedValue(true);
    vi.mocked(rateLimit).mockReturnValue({ success: true, remaining: 100, headers: {} });
  });

  describe("GET /api/comments", () => {
    it("should require authentication", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new AuthenticationError("Not authenticated"));

      const request = new Request(`http://localhost/api/comments?entry_id=${VALID_ENTRY_ID}`);
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should require entry_id or training_session_id", async () => {
      const request = new Request("http://localhost/api/comments");
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("Validation error");
    });

    it("should return 404 for non-existent entry", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const request = new Request(`http://localhost/api/comments?entry_id=${VALID_ENTRY_ID}`);
      const response = await GET(request);

      expect(response.status).toBe(404);
    });

    it("should deny access to unconnected users", async () => {
      vi.mocked(canAccessPatientData).mockResolvedValue(false);

      const request = new Request(`http://localhost/api/comments?entry_id=${VALID_ENTRY_ID}`);
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it("should return comments for connected user", async () => {
      const mockComments = [
        { id: "c1", nutritionist_id: "n1", comment: "Good job!" },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "nutrition_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { user_id: PATIENT_ID }, error: null }),
              }),
            }),
          };
        }
        if (table === "nutritionist_comments") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockComments, error: null }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [{ id: "n1", full_name: "Dr. Smith" }], error: null }),
            }),
          };
        }
        return {};
      });

      const request = new Request(`http://localhost/api/comments?entry_id=${VALID_ENTRY_ID}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0]).toHaveProperty("nutritionist");
    });
  });

  describe("POST /api/comments", () => {
    it("should require nutritionist role", async () => {
      vi.mocked(requireRole).mockRejectedValue(new RoleError("Not a nutritionist"));

      const request = new Request("http://localhost/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: VALID_ENTRY_ID, comment: "Test comment" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.error).toContain("nutritionist");
    });

    it("should reject comment on non-existent entry", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn(),
      });

      const request = new Request("http://localhost/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: VALID_ENTRY_ID, comment: "Test" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it("should reject comment from unconnected nutritionist", async () => {
      vi.mocked(canAccessPatientData).mockResolvedValue(false);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { user_id: PATIENT_ID }, error: null }),
          }),
        }),
        insert: vi.fn(),
      });

      const request = new Request("http://localhost/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: VALID_ENTRY_ID, comment: "Test" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.error).toContain("not connected");
    });

    it("should create comment successfully", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "nutrition_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { user_id: PATIENT_ID }, error: null }),
              }),
            }),
          };
        }
        if (table === "nutritionist_comments") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: VALID_COMMENT_ID, comment: "Great progress!" }],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const request = new Request("http://localhost/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: VALID_ENTRY_ID, comment: "Great progress!" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.data.comment).toBe("Great progress!");
    });

    it("should validate comment content", async () => {
      const request = new Request("http://localhost/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: VALID_ENTRY_ID }), // Missing comment
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/comments", () => {
    it("should require nutritionist role", async () => {
      vi.mocked(requireRole).mockRejectedValue(new RoleError("Not a nutritionist"));

      const request = new Request("http://localhost/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: VALID_COMMENT_ID, comment: "Updated" }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(403);
    });

    it("should only allow editing own comments", async () => {
      // Simulate no rows updated (comment not owned by user)
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const OTHER_COMMENT_ID = "123e4567-e89b-12d3-a456-426614174099";
      const request = new Request("http://localhost/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: OTHER_COMMENT_ID, comment: "Trying to edit" }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.error).toContain("not authorized");
    });

    it("should update own comment successfully", async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: VALID_COMMENT_ID, comment: "Updated content" }],
                error: null,
              }),
            }),
          }),
        }),
      });

      const request = new Request("http://localhost/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: VALID_COMMENT_ID, comment: "Updated content" }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.comment).toBe("Updated content");
    });
  });

  describe("DELETE /api/comments", () => {
    it("should require nutritionist role", async () => {
      vi.mocked(requireRole).mockRejectedValue(new RoleError("Not a nutritionist"));

      const request = new Request(`http://localhost/api/comments?id=${VALID_COMMENT_ID}`, {
        method: "DELETE",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(403);
    });

    it("should require comment id", async () => {
      const request = new Request("http://localhost/api/comments", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
    });

    it("should use strict rate limiting", async () => {
      const request = new Request(`http://localhost/api/comments?id=${VALID_COMMENT_ID}`, {
        method: "DELETE",
      });

      await DELETE(request);
      expect(rateLimit).toHaveBeenCalledWith(expect.anything(), "strict");
    });

    it("should delete comment successfully", async () => {
      const request = new Request(`http://localhost/api/comments?id=${VALID_COMMENT_ID}`, {
        method: "DELETE",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
    });
  });
});
