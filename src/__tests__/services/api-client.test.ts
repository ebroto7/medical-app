/**
 * Tests for API Client
 *
 * Tests the base API client functionality:
 * - GET/POST/PUT/PATCH/DELETE methods
 * - Auth header injection
 * - Query parameter handling
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiClient, ApiError } from "@/services/api-client";

describe("API Client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe("createApiClient", () => {
    it("should create client without token", () => {
      const client = createApiClient();
      expect(client).toHaveProperty("get");
      expect(client).toHaveProperty("post");
      expect(client).toHaveProperty("put");
      expect(client).toHaveProperty("patch");
      expect(client).toHaveProperty("delete");
      expect(client).toHaveProperty("upload");
    });

    it("should create client with token", () => {
      const client = createApiClient("test-token");
      expect(client).toBeDefined();
    });
  });

  describe("GET requests", () => {
    it("should make GET request with correct URL", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ data: "test" }), { status: 200 })
      );

      const client = createApiClient();
      await client.get("/api/test");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/test"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should include auth header when token provided", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ data: "test" }), { status: 200 })
      );

      const client = createApiClient("my-token");
      await client.get("/api/test");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer my-token",
          }),
        })
      );
    });

    it("should append query params to URL", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );

      const client = createApiClient();
      await client.get("/api/entries", {
        params: { date: "2024-01-15", limit: 10 },
      });

      const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain("date=2024-01-15");
      expect(calledUrl).toContain("limit=10");
    });

    it("should skip undefined/null params", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );

      const client = createApiClient();
      await client.get("/api/entries", {
        params: { date: "2024-01-15", filter: undefined, search: null },
      });

      const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain("date=2024-01-15");
      expect(calledUrl).not.toContain("filter");
      expect(calledUrl).not.toContain("search");
    });

    it("should return data property from response", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ data: { id: "123", name: "Test" } }), { status: 200 })
      );

      const client = createApiClient();
      const result = await client.get<{ id: string; name: string }>("/api/test");

      expect(result).toEqual({ id: "123", name: "Test" });
    });

    it("should throw ApiError on non-OK response", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
      );

      const client = createApiClient();

      await expect(client.get("/api/nonexistent")).rejects.toThrow(ApiError);

      try {
        await client.get("/api/nonexistent");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
      }
    });
  });

  describe("POST requests", () => {
    it("should make POST request with JSON body", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ data: { id: "new-123" } }), { status: 201 })
      );

      const client = createApiClient("token");
      await client.post("/api/entries", {
        body: { name: "Test Entry", date: "2024-01-15" },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/entries"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ name: "Test Entry", date: "2024-01-15" }),
        })
      );
    });

    it("should return created data", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ data: { id: "created-123" } }), { status: 201 })
      );

      const client = createApiClient();
      const result = await client.post<{ id: string }>("/api/entries", {
        body: { name: "Test" },
      });

      expect(result).toEqual({ id: "created-123" });
    });
  });

  describe("PUT requests", () => {
    it("should make PUT request", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ data: { updated: true } }), { status: 200 })
      );

      const client = createApiClient();
      await client.put("/api/entries/123", {
        body: { name: "Updated" },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  describe("PATCH requests", () => {
    it("should make PATCH request", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ data: { patched: true } }), { status: 200 })
      );

      const client = createApiClient();
      await client.patch("/api/entries/123", {
        body: { description: "New description" },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  describe("DELETE requests", () => {
    it("should make DELETE request", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const client = createApiClient();
      await client.delete("/api/entries/123");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/entries/123"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("should support params in DELETE", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const client = createApiClient();
      await client.delete("/api/sessions", { params: { id: "session-123" } });

      const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain("id=session-123");
    });
  });

  describe("Error handling", () => {
    it("should include error code in ApiError", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: "Forbidden", code: "ACCESS_DENIED" }), { status: 403 })
      );

      const client = createApiClient();

      try {
        await client.get("/api/protected");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe("ACCESS_DENIED");
      }
    });

    it("should include details in ApiError", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Validation error",
            details: [{ path: ["name"], message: "Required" }],
          }),
          { status: 400 }
        )
      );

      const client = createApiClient();

      try {
        await client.post("/api/entries", { body: {} });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).details).toEqual([{ path: ["name"], message: "Required" }]);
      }
    });

    it("should handle non-JSON error response", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response("Internal Server Error", { status: 500 })
      );

      const client = createApiClient();

      await expect(client.get("/api/broken")).rejects.toThrow(ApiError);
    });
  });
});
