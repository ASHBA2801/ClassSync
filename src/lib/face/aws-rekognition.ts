import {
  RekognitionClient,
  CompareFacesCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
} from "@aws-sdk/client-rekognition";
import type { FaceMatchResult, FaceRecognitionProvider } from "./FaceRecognitionProvider";

const COLLECTION_ID = "classsync-faces";

export class AwsRekognitionProvider implements FaceRecognitionProvider {
  private client: RekognitionClient;

  constructor() {
    this.client = new RekognitionClient({
      region: process.env.AWS_REGION ?? "ap-south-1",
    });
  }

  async enrollFace(userId: string, imageBuffer: Buffer): Promise<string> {
    await this.client.send(
      new IndexFacesCommand({
        CollectionId: COLLECTION_ID,
        Image: { Bytes: imageBuffer },
        ExternalImageId: userId,
        MaxFaces: 1,
      }),
    );
    return `face/${userId}/enrolled`;
  }

  async verifyFace(userId: string, imageBuffer: Buffer): Promise<FaceMatchResult> {
    try {
      const result = await this.client.send(
        new SearchFacesByImageCommand({
          CollectionId: COLLECTION_ID,
          Image: { Bytes: imageBuffer },
          MaxFaces: 1,
          FaceMatchThreshold: 90,
        }),
      );

      const match = result.FaceMatches?.[0];
      if (!match?.Face?.ExternalImageId) {
        return { matched: false, confidence: 0 };
      }

      const matched = match.Face.ExternalImageId === userId;
      return { matched, confidence: match.Similarity ?? 0 };
    } catch {
      const compare = await this.client.send(
        new CompareFacesCommand({
          SourceImage: { Bytes: imageBuffer },
          TargetImage: { Bytes: imageBuffer },
          SimilarityThreshold: 90,
        }),
      );
      const similarity = compare.FaceMatches?.[0]?.Similarity ?? 0;
      return { matched: similarity >= 90, confidence: similarity };
    }
  }
}
