"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getVisitorPhotoUploadUrlAction,
  logVisitorAction,
  uploadVisitorPhotoBase64Action,
} from "@/actions/staff-modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileInput } from "@/components/ui/file-input";
import { Camera, X } from "lucide-react";

export function SecurityCheckInForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Camera access denied. You can upload a photo instead.");
    }
  }

  function captureFromCamera() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhotoBase64(dataUrl);
    setPhotoFile(null);
    setPreviewUrl(dataUrl);
    stopCamera();
  }

  function onFileSelected(file: File | null) {
    setPhotoFile(file);
    setPhotoBase64(null);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      stopCamera();
    } else {
      setPreviewUrl(null);
    }
  }

  function clearPhoto() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPhotoFile(null);
    setPhotoBase64(null);
  }

  async function resolvePhotoKey(): Promise<string> {
    if (photoBase64) {
      const { key } = await uploadVisitorPhotoBase64Action(photoBase64);
      return key;
    }
    if (photoFile) {
      const { uploadUrl, key } = await getVisitorPhotoUploadUrlAction({
        filename: photoFile.name || "visitor.jpg",
        mimeType: photoFile.type || "image/jpeg",
      });
      const resp = await fetch(uploadUrl, {
        method: "PUT",
        body: photoFile,
        headers: { "Content-Type": photoFile.type || "image/jpeg" },
      });
      if (!resp.ok) throw new Error(`Photo upload failed (${resp.status})`);
      return key;
    }
    throw new Error("Visitor photo is required");
  }

  async function handleLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      const photoS3Key = await resolvePhotoKey();
      await logVisitorAction({
        visitorName: (fd.get("visitorName") as string).trim(),
        purpose: (fd.get("purpose") as string).trim(),
        phone: (fd.get("phone") as string).trim(),
        notes: ((fd.get("notes") as string) || "").trim() || undefined,
        photoS3Key,
      });
      form.reset();
      clearPhoto();
      router.push("/staff/security/logs");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log visitor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLog} className="glass-card mx-auto max-w-lg space-y-4 p-5">
      <div>
        <h3 className="text-lg font-medium text-text-1">School Entry Check-In</h3>
        <p className="mt-1 text-sm text-text-2">
          Record anyone entering the campus with a photo for security.
        </p>
      </div>

      <div>
        <Label htmlFor="visitorName">Name</Label>
        <Input id="visitorName" name="visitorName" required disabled={loading} />
      </div>

      <div>
        <Label htmlFor="phone">Mobile No</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="10-digit mobile number"
          required
          disabled={loading}
        />
      </div>

      <div>
        <Label htmlFor="purpose">Reason</Label>
        <Input
          id="purpose"
          name="purpose"
          placeholder="e.g. Parent meeting, delivery, interview"
          required
          disabled={loading}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" disabled={loading} />
      </div>

      <div className="space-y-2">
        <Label>Photo of person</Label>
        <div className="flex flex-wrap gap-2">
          {!cameraOn ? (
            <Button type="button" variant="outline" onClick={startCamera} disabled={loading}>
              <Camera className="mr-2 h-4 w-4" />
              Use camera
            </Button>
          ) : (
            <>
              <Button type="button" onClick={captureFromCamera}>
                Capture
              </Button>
              <Button type="button" variant="outline" onClick={stopCamera}>
                Cancel camera
              </Button>
            </>
          )}
        </div>

        {cameraOn && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="mt-2 aspect-[4/3] w-full rounded-[var(--radius-sm)] border border-border bg-black object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {!cameraOn && (
          <FileInput
            name="photo"
            accept="image/*"
            disabled={loading}
            onChange={onFileSelected}
          />
        )}

        {previewUrl && (
          <div className="relative mt-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Visitor preview"
              className="h-40 w-40 rounded-[var(--radius-sm)] border border-border object-cover"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute -right-2 -top-2 rounded-full border border-border bg-surface p-1 text-text-2 hover:text-text-1"
              aria-label="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={loading || (!photoFile && !photoBase64)} className="w-full">
        {loading ? "Checking in…" : "Check In"}
      </Button>
    </form>
  );
}
