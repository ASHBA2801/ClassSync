import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CompreFaceProvider } from "@/lib/face/compre-face";

describe("CompreFaceProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      COMPREFACE_URL: "http://mock-compreface:8000",
      COMPREFACE_API_KEY: "mock-api-key",
    };
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  describe("enrollFace", () => {
    it("should successfully enroll a face and return a key", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ image_id: "mock-image-id-123", subject: "user-123" }),
      } as Response);

      const provider = new CompreFaceProvider();
      const result = await provider.enrollFace("user-123", Buffer.from("fake-image"));

      expect(result).toBe("compreface/user-123/mock-image-id-123");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://mock-compreface:8000/api/v1/recognition/faces?subject=user-123",
        expect.objectContaining({
          method: "POST",
          headers: {
            "x-api-key": "mock-api-key",
          },
          body: expect.any(FormData),
        })
      );
    });

    it("should throw error if response is not ok", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
        text: async () => "Invalid image",
      } as Response);

      const provider = new CompreFaceProvider();
      await expect(
        provider.enrollFace("user-123", Buffer.from("fake-image"))
      ).rejects.toThrow("CompreFace face enrollment failed: Bad Request (Invalid image)");
    });
  });

  describe("verifyFace", () => {
    it("should successfully match a face and return a high confidence match", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [
            {
              subjects: [
                { subject: "user-123", similarity: 0.95 },
                { subject: "user-456", similarity: 0.20 },
              ],
            },
          ],
        }),
      } as Response);

      const provider = new CompreFaceProvider();
      const result = await provider.verifyFace("user-123", Buffer.from("fake-image"));

      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(95);
      expect(result.error).toBeUndefined();
    });

    it("should return false if subject does not match", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [
            {
              subjects: [
                { subject: "user-456", similarity: 0.98 },
              ],
            },
          ],
        }),
      } as Response);

      const provider = new CompreFaceProvider();
      const result = await provider.verifyFace("user-123", Buffer.from("fake-image"));

      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it("should return false if similarity is below threshold", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [
            {
              subjects: [
                { subject: "user-123", similarity: 0.85 },
              ],
            },
          ],
        }),
      } as Response);

      const provider = new CompreFaceProvider();
      const result = await provider.verifyFace("user-123", Buffer.from("fake-image"));

      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(85); // 0.85 * 100
    });

    it("should return error if API call fails", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Error",
        text: async () => "DB connection timeout",
      } as Response);

      const provider = new CompreFaceProvider();
      const result = await provider.verifyFace("user-123", Buffer.from("fake-image"));

      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toContain("CompreFace API error: Internal Error (DB connection timeout)");
    });
  });
});
