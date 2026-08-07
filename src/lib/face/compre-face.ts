import type { FaceMatchResult, FaceRecognitionProvider } from "./FaceRecognitionProvider";

export class CompreFaceProvider implements FaceRecognitionProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.COMPREFACE_URL || "http://localhost:8000";
    this.apiKey = process.env.COMPREFACE_API_KEY || "";
    if (!this.apiKey) {
      console.warn("CompreFaceProvider initialized without COMPREFACE_API_KEY environment variable.");
    }
  }

  async enrollFace(userId: string, imageBuffer: Buffer): Promise<string> {
    const url = `${this.baseUrl}/api/v1/recognition/faces?subject=${encodeURIComponent(userId)}`;

    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: "image/jpeg" });
    formData.append("file", blob, `${userId}.jpg`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CompreFace face enrollment failed: ${response.statusText} (${errorText})`);
    }

    const result = await response.json();
    if (!result.image_id) {
      throw new Error(`CompreFace face enrollment response did not contain image_id: ${JSON.stringify(result)}`);
    }

    return `compreface/${userId}/${result.image_id}`;
  }

  async verifyFace(userId: string, imageBuffer: Buffer): Promise<FaceMatchResult> {
    const url = `${this.baseUrl}/api/v1/recognition/recognize?limit=1`;

    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: "image/jpeg" });
    formData.append("file", blob, `verify_${userId}.jpg`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          matched: false,
          confidence: 0,
          error: `CompreFace API error: ${response.statusText} (${errorText})`,
        };
      }

      const data = await response.json();
      const faceResult = data.result?.[0];

      if (!faceResult) {
        return { matched: false, confidence: 0, error: "No face detected in the image" };
      }

      const match = faceResult.subjects?.find(
        (s: { subject: string; similarity: number }) => s.subject === userId
      );

      if (!match) {
        return { matched: false, confidence: 0 };
      }

      // CompreFace similarity is between 0.0 and 1.0. We map it to 0-100 range.
      const confidence = match.similarity * 100;
      const matched = match.similarity >= 0.90;

      return { matched, confidence };
    } catch (err) {
      return {
        matched: false,
        confidence: 0,
        error: err instanceof Error ? err.message : "Unknown error during CompreFace verification",
      };
    }
  }
}
