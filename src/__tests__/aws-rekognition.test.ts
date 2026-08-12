import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceAlreadyExistsException, ResourceNotFoundException } from "@aws-sdk/client-rekognition";

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-rekognition", async () => {
  const actual = await vi.importActual<typeof import("@aws-sdk/client-rekognition")>(
    "@aws-sdk/client-rekognition",
  );

  return {
    ...actual,
    RekognitionClient: vi.fn(function RekognitionClientMock() {
      return { send: sendMock };
    }),
  };
});

describe("AwsRekognitionProvider", () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.resetModules();
  });

  async function loadProvider() {
    const { AwsRekognitionProvider } = await import("@/lib/face/aws-rekognition");
    return new AwsRekognitionProvider();
  }

  it("creates the collection on first enroll", async () => {
    sendMock
      .mockResolvedValueOnce({ CollectionArn: "arn:aws:rekognition:collection/classsync-faces" })
      .mockResolvedValueOnce({ FaceRecords: [{ Face: { FaceId: "face-1" } }] });

    const provider = await loadProvider();
    const result = await provider.enrollFace("user-123", Buffer.from("face-image"));

    expect(result).toBe("face/user-123/enrolled");
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("reuses the existing collection when it already exists", async () => {
    sendMock
      .mockRejectedValueOnce(new ResourceAlreadyExistsException({ message: "exists", $metadata: {} }))
      .mockResolvedValueOnce({ FaceRecords: [{ Face: { FaceId: "face-1" } }] });

    const provider = await loadProvider();
    await provider.enrollFace("user-123", Buffer.from("face-image"));

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("throws when enrollment image has no detectable face", async () => {
    sendMock
      .mockResolvedValueOnce({ CollectionArn: "arn:aws:rekognition:collection/classsync-faces" })
      .mockResolvedValueOnce({ FaceRecords: [] });

    const provider = await loadProvider();
    await expect(provider.enrollFace("user-123", Buffer.from("face-image"))).rejects.toThrow(
      "No face detected in the image",
    );
  });

  it("verifies a face with SearchFacesByImage only", async () => {
    sendMock
      .mockResolvedValueOnce({ CollectionArn: "arn:aws:rekognition:collection/classsync-faces" })
      .mockResolvedValueOnce({
        FaceMatches: [
          {
            Similarity: 95,
            Face: { ExternalImageId: "user-123" },
          },
        ],
      });

    const provider = await loadProvider();
    const result = await provider.verifyFace("user-123", Buffer.from("face-image"));

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(95);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("returns false when the best match belongs to another user", async () => {
    sendMock
      .mockResolvedValueOnce({ CollectionArn: "arn:aws:rekognition:collection/classsync-faces" })
      .mockResolvedValueOnce({
        FaceMatches: [
          {
            Similarity: 98,
            Face: { ExternalImageId: "other-user" },
          },
        ],
      });

    const provider = await loadProvider();
    const result = await provider.verifyFace("user-123", Buffer.from("face-image"));

    expect(result.matched).toBe(false);
    expect(result.confidence).toBe(98);
    expect(result.error).toBe("Face matched a different user");
  });

  it("returns a helpful error when the collection does not exist", async () => {
    sendMock
      .mockResolvedValueOnce({ CollectionArn: "arn:aws:rekognition:collection/classsync-faces" })
      .mockRejectedValueOnce(new ResourceNotFoundException({ message: "missing", $metadata: {} }));

    const provider = await loadProvider();
    const result = await provider.verifyFace("user-123", Buffer.from("face-image"));

    expect(result.matched).toBe(false);
    expect(result.error).toBe("Face collection not configured. Enroll your face first.");
  });
});
