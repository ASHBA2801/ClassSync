"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FaceAttendanceSubmitResult } from "@/lib/attendance/face-attendance";

type FaceAttendanceActions = {
  submit: (input: {
    geoLat: number;
    geoLng: number;
    imageBase64?: string;
  }) => Promise<FaceAttendanceSubmitResult>;
  getStatus: (attendanceId: string) => Promise<{ status: string } | null>;
  enrollFace: (imageBase64: string) => Promise<void>;
};

type Mode = "enroll" | "attendance";

export function FaceAttendanceFlow({
  actions,
  initiallyEnrolled = false,
  canMarkAttendance = true,
}: {
  actions: FaceAttendanceActions;
  initiallyEnrolled?: boolean;
  canMarkAttendance?: boolean;
}) {
  const [faceEnrolled, setFaceEnrolled] = useState(initiallyEnrolled);
  const [mode, setMode] = useState<Mode>(initiallyEnrolled ? "attendance" : "enroll");
  const [status, setStatus] = useState<string>("idle");
  const [message, setMessage] = useState("");
  const [attemptNumber, setAttemptNumber] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    setStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setCameraReady(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    setMessage("");
    setCameraReady(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      const video = videoRef.current;
      if (video) {
        video.srcObject = mediaStream;
        await video.play().catch(() => undefined);
        const markReady = () => setCameraReady(true);
        if (video.readyState >= 2) markReady();
        else video.onloadeddata = markReady;
      }
    } catch {
      setStatus("error");
      setMessage("Camera access denied. Allow camera permission and try again.");
    }
  }, []);

  const captureImage = useCallback((): string | undefined => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return undefined;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1];
    return base64 && base64.length > 100 ? base64 : undefined;
  }, []);

  async function pollStatus(id: string) {
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const record = await actions.getStatus(id);
      if (record && record.status !== "PROCESSING") {
        setStatus(record.status);
        setMessage(`Final status: ${record.status}`);
        return;
      }
    }
    setMessage("Still processing... check back shortly.");
  }

  async function handleEnroll() {
    setStatus("loading");
    setMessage("Capturing and enrolling your face…");
    const imageBase64 = captureImage();
    if (!imageBase64) {
      setStatus("error");
      setMessage("Could not capture a photo. Start the camera, wait a moment, then try again.");
      return;
    }

    try {
      await actions.enrollFace(imageBase64);
      setFaceEnrolled(true);
      setStatus("enrolled");
      setMessage("Face enrolled successfully. You can mark attendance now.");
      setMode("attendance");
    } catch (err) {
      setStatus("error");
      const raw = err instanceof Error ? err.message : "Enrollment failed";
      if (/security token|UnrecognizedClient|credentials|AccessDenied/i.test(raw)) {
        setMessage(
          "AWS credentials are invalid. Fix AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, or set FACE_PROVIDER=mock for local testing.",
        );
      } else if (/No face detected/i.test(raw)) {
        setMessage("No face detected. Face the camera with good lighting and try again.");
      } else {
        setMessage(raw);
      }
    }
  }

  async function handleSubmit() {
    if (!faceEnrolled) {
      setStatus("error");
      setMessage("Enroll your face first (one-time), then mark attendance.");
      setMode("enroll");
      return;
    }

    setStatus("loading");
    setMessage("");

    if (!navigator.geolocation) {
      setMessage("Geolocation not supported");
      setStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const imageBase64 = captureImage();
        if (!imageBase64) {
          setStatus("error");
          setMessage("Could not capture a photo. Start the camera first.");
          return;
        }
        try {
          const result = await actions.submit({
            geoLat: position.coords.latitude,
            geoLng: position.coords.longitude,
            imageBase64,
          });

          if (result.blocked) {
            setStatus("blocked");
            setMessage(result.message ?? "Outside geofence");
            return;
          }

          setAttemptNumber(result.attemptNumber ?? 0);
          setStatus(result.status ?? "PROCESSING");
          setMessage(`Attempt ${result.attemptNumber}: ${result.status}`);

          if (result.attendanceId && result.status === "PROCESSING") {
            pollStatus(result.attendanceId);
          }
        } catch (err) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : "Failed");
        }
      },
      () => {
        setStatus("error");
        setMessage("GPS location is required to mark attendance (not for enrollment).");
      },
      { enableHighAccuracy: true },
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {faceEnrolled ? "Face enrolled" : "Step 1 — Enroll your face (one-time)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {faceEnrolled ? (
            <p className="text-sm text-success">
              Your face is registered. Use Mark Attendance below each day.
            </p>
          ) : (
            <p className="text-sm text-text-2">
              Enrollment only needs the camera — no GPS. Start the camera, face it clearly, then
              tap Capture &amp; Enroll.
            </p>
          )}

          {!faceEnrolled && (
            <div className="flex flex-wrap gap-2">
              {!stream ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMode("enroll");
                    startCamera();
                  }}
                >
                  Start Camera
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleEnroll}
                  disabled={status === "loading" || !cameraReady}
                >
                  {status === "loading" && mode === "enroll"
                    ? "Enrolling…"
                    : cameraReady
                      ? "Capture & Enroll"
                      : "Camera warming up…"}
                </Button>
              )}
            </div>
          )}

          {faceEnrolled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setMode("enroll");
                setFaceEnrolled(false);
                setMessage("Re-enrollment mode. Capture a new photo.");
                startCamera();
              }}
            >
              Re-enroll face
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2 — Mark Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full rounded-[var(--radius-sm)] bg-black/40 object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {!stream && faceEnrolled && canMarkAttendance && (
            <Button type="button" onClick={startCamera} variant="outline">
              Start Camera
            </Button>
          )}

          {canMarkAttendance ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={status === "loading" || !faceEnrolled || !cameraReady}
              className="w-full"
            >
              {!faceEnrolled
                ? "Enroll face first"
                : status === "loading" && mode === "attendance"
                  ? "Submitting…"
                  : !cameraReady
                    ? "Start camera first"
                    : "Submit Attendance"}
            </Button>
          ) : (
            <p className="text-sm text-text-2">Attendance for today is already recorded.</p>
          )}

          {message && (
            <p
              className={`text-sm ${
                status === "PRESENT" || status === "enrolled"
                  ? "text-success"
                  : status === "blocked" || status === "error"
                    ? "text-danger"
                    : "text-text-2"
              }`}
            >
              {message}
            </p>
          )}

          {attemptNumber > 0 && attemptNumber < 3 && status === "FAILED" && (
            <p className="text-sm text-warning">
              Retry within 5 minutes (attempt {attemptNumber}/3)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
