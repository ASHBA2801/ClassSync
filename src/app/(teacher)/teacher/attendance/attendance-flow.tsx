"use client";

import { useState, useRef, useCallback } from "react";
import {
  submitTeacherAttendanceAction,
  getTeacherAttendanceStatusAction,
  enrollFaceAction,
} from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AttendanceFlow() {
  const [status, setStatus] = useState<string>("idle");
  const [message, setMessage] = useState("");
  const [attemptNumber, setAttemptNumber] = useState(0);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setMessage("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const captureImage = useCallback((): string | undefined => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return undefined;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    return dataUrl.split(",")[1];
  }, []);

  async function handleSubmit() {
    setStatus("loading");
    setMessage("");

    if (!navigator.geolocation) {
      setMessage("Geolocation not supported");
      setStatus("error");
      return;
    }

    // Device GPS only — campus coords come from Google Maps at school registration.
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const imageBase64 = captureImage();
        try {
          const result = await submitTeacherAttendanceAction({
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
          if (result.attendanceId) setAttendanceId(result.attendanceId);
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
        setMessage("GPS location required for attendance");
      },
      { enableHighAccuracy: true },
    );
  }

  async function pollStatus(id: string) {
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const record = await getTeacherAttendanceStatusAction(id);
      if (record && record.status !== "PROCESSING") {
        setStatus(record.status);
        setMessage(`Final status: ${record.status}`);
        return;
      }
    }
    setMessage("Still processing... check back shortly.");
  }

  async function handleEnrollFace() {
    await startCamera();
    setTimeout(async () => {
      const imageBase64 = captureImage();
      if (imageBase64) {
        await enrollFaceAction(imageBase64);
        setMessage("Face enrolled successfully");
      }
    }, 2000);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader><CardTitle>Face Enrollment (one-time)</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={handleEnrollFace} variant="outline" className="mb-4">
            Enroll Face
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mark Attendance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded bg-zinc-100" />
          <canvas ref={canvasRef} className="hidden" />

          {!stream && (
            <Button onClick={startCamera} variant="outline">Start Camera</Button>
          )}

          <Button onClick={handleSubmit} disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Submitting..." : "Submit Attendance"}
          </Button>

          {message && (
            <p className={`text-sm ${status === "PRESENT" ? "text-green-600" : status === "blocked" || status === "error" ? "text-red-600" : "text-zinc-600"}`}>
              {message}
            </p>
          )}

          {attemptNumber > 0 && attemptNumber < 3 && status === "FAILED" && (
            <p className="text-sm text-amber-600">
              Retry within 5 minutes (attempt {attemptNumber}/3)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
