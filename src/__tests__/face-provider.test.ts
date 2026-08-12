import { afterEach, describe, expect, it } from "vitest";
import { AwsRekognitionProvider } from "@/lib/face/aws-rekognition";
import {
  getFaceRecognitionProvider,
  MockFaceRecognitionProvider,
} from "@/lib/face/FaceRecognitionProvider";

describe("getFaceRecognitionProvider", () => {
  const originalFaceProvider = process.env.FACE_PROVIDER;

  afterEach(() => {
    if (originalFaceProvider === undefined) {
      delete process.env.FACE_PROVIDER;
    } else {
      process.env.FACE_PROVIDER = originalFaceProvider;
    }
  });

  it("returns mock provider when FACE_PROVIDER=mock", () => {
    process.env.FACE_PROVIDER = "mock";
    expect(getFaceRecognitionProvider()).toBeInstanceOf(MockFaceRecognitionProvider);
  });

  it("returns AWS Rekognition by default", () => {
    delete process.env.FACE_PROVIDER;
    expect(getFaceRecognitionProvider()).toBeInstanceOf(AwsRekognitionProvider);
  });

  it("returns AWS Rekognition when FACE_PROVIDER=aws", () => {
    process.env.FACE_PROVIDER = "aws";
    expect(getFaceRecognitionProvider()).toBeInstanceOf(AwsRekognitionProvider);
  });
});
