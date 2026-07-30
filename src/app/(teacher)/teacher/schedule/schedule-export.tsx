"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

interface Slot {
  id: string;
  dayOfWeek: number;
  periodNo: number;
  subject: { name: string };
  classSection: { name: string };
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ScheduleExport({ schedule }: { schedule: Slot[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function exportAsImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = "#000000";
    ctx.font = "16px sans-serif";
    ctx.fillText("ClassSync Schedule", 20, 30);

    let y = 60;
    DAYS.forEach((day, i) => {
      const slots = schedule.filter((s) => s.dayOfWeek === i);
      if (slots.length === 0) return;
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(day, 20, y);
      y += 20;
      ctx.font = "12px sans-serif";
      slots.forEach((s) => {
        ctx.fillText(`P${s.periodNo}: ${s.subject.name} (${s.classSection.name})`, 40, y);
        y += 18;
      });
      y += 10;
    });

    const link = document.createElement("a");
    link.download = "schedule.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={exportAsImage}>Export as Image</Button>
      <Button variant="outline" onClick={() => window.print()}>Print / Save PDF</Button>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
