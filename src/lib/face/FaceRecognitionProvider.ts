import { AwsRekognitionProvider } from "./aws-rekognition";

export interface FaceMatchResult {
  matched: boolean;
  confidence: number;
  error?: string;
}

export interface FaceRecognitionProvider {
  enrollFace(userId: string, imageBuffer: Buffer): Promise<string>;
  verifyFace(userId: string, imageBuffer: Buffer): Promise<FaceMatchResult>;
}

/** In-memory provider for local dev when AWS credentials are unavailable. */
export class MockFaceRecognitionProvider implements FaceRecognitionProvider {
  private enrolled = new Map<string, string>();

  async enrollFace(userId: string, _imageBuffer: Buffer): Promise<string> {
    const key = `face/${userId}/${Date.now()}.jpg`;
    this.enrolled.set(userId, key);
    return key;
  }

  async verifyFace(userId: string, imageBuffer: Buffer): Promise<FaceMatchResult> {
    if (!this.enrolled.has(userId)) {
      return { matched: false, confidence: 0, error: "Face not enrolled" };
    }
    const hash = imageBuffer.length % 100;
    return { matched: hash > 20, confidence: hash / 100 };
  }
}

/** Singleton so enroll + verify in the same Node process share state (mock only). */
let mockProvider: MockFaceRecognitionProvider | null = null;

/**
 * Cloud face recognition via AWS Rekognition (default).
 * Set FACE_PROVIDER=mock for local dev without AWS credentials.
 */
export function getFaceRecognitionProvider(): FaceRecognitionProvider {
  if (process.env.FACE_PROVIDER === "mock") {
    if (!mockProvider) mockProvider = new MockFaceRecognitionProvider();
    return mockProvider;
  }
  return new AwsRekognitionProvider();
}
