import {
  CreateCollectionCommand,
  IndexFacesCommand,
  RekognitionClient,
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
  SearchFacesByImageCommand,
} from "@aws-sdk/client-rekognition";
import type { FaceMatchResult, FaceRecognitionProvider } from "./FaceRecognitionProvider";

const COLLECTION_ID = "classsync-faces";
const MATCH_THRESHOLD = 90;

// Face Liveness (CreateFaceLivenessSession) can be added later for anti-spoofing.

export class AwsRekognitionProvider implements FaceRecognitionProvider {
  private client: RekognitionClient;
  private collectionReady: Promise<void> | null = null;

  constructor() {
    this.client = new RekognitionClient({
      region: process.env.AWS_REGION ?? "ap-south-1",
    });
  }

  private async ensureCollectionExists(): Promise<void> {
    if (!this.collectionReady) {
      this.collectionReady = this.createCollectionIfNeeded();
    }
    await this.collectionReady;
  }

  private async createCollectionIfNeeded(): Promise<void> {
    try {
      await this.client.send(
        new CreateCollectionCommand({
          CollectionId: COLLECTION_ID,
        }),
      );
    } catch (error) {
      if (error instanceof ResourceAlreadyExistsException) {
        return;
      }
      throw error;
    }
  }

  async enrollFace(userId: string, imageBuffer: Buffer): Promise<string> {
    await this.ensureCollectionExists();

    const result = await this.client.send(
      new IndexFacesCommand({
        CollectionId: COLLECTION_ID,
        Image: { Bytes: imageBuffer },
        ExternalImageId: userId,
        MaxFaces: 1,
      }),
    );

    if (!result.FaceRecords?.length) {
      throw new Error("No face detected in the image");
    }

    return `face/${userId}/enrolled`;
  }

  async verifyFace(userId: string, imageBuffer: Buffer): Promise<FaceMatchResult> {
    try {
      await this.ensureCollectionExists();

      const result = await this.client.send(
        new SearchFacesByImageCommand({
          CollectionId: COLLECTION_ID,
          Image: { Bytes: imageBuffer },
          MaxFaces: 1,
          FaceMatchThreshold: MATCH_THRESHOLD,
        }),
      );

      const match = result.FaceMatches?.[0];
      if (!match?.Face?.ExternalImageId) {
        return { matched: false, confidence: 0, error: "No matching face found" };
      }

      const matched = match.Face.ExternalImageId === userId;
      return {
        matched,
        confidence: match.Similarity ?? 0,
        error: matched ? undefined : "Face matched a different user",
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        return {
          matched: false,
          confidence: 0,
          error: "Face collection not configured. Enroll your face first.",
        };
      }

      return {
        matched: false,
        confidence: 0,
        error: error instanceof Error ? error.message : "Face verification failed",
      };
    }
  }
}
