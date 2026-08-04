"use client";

import { useState, useTransition } from "react";
import {
  previewScheduleEditAction,
  updateScheduleSlotAction,
  regenerateScheduleForTeachersAction,
} from "@/actions/scheduler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Slot {
  id: string;
  dayOfWeek: number;
  periodNo: number;
  teacherId: string;
  classSectionId: string;
  subjectId: string;
  classSection: { name: string };
  subject: { name: string };
}

interface Teacher {
  id: string;
  name: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ScheduleEditPanel({
  slots,
  teachers,
}: {
  slots: Slot[];
  teachers: Teacher[];
}) {
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [preview, setPreview] = useState<{ hasConflict: boolean; conflictMessage: string | null } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  function teacherName(id: string) {
    return teachers.find((t) => t.id === id)?.name ?? id.slice(0, 8);
  }

  function handlePreview() {
    if (!selectedSlot || !teacherId) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await previewScheduleEditAction({
          slotId: selectedSlot.id,
          teacherId,
          classSectionId: selectedSlot.classSectionId,
          subjectId: selectedSlot.subjectId,
          dayOfWeek: selectedSlot.dayOfWeek,
          periodNo: selectedSlot.periodNo,
        });
        setPreview(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Preview failed");
      }
    });
  }

  function handleSave() {
    if (!selectedSlot || !teacherId) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await updateScheduleSlotAction({
          slotId: selectedSlot.id,
          teacherId,
          classSectionId: selectedSlot.classSectionId,
          subjectId: selectedSlot.subjectId,
          dayOfWeek: selectedSlot.dayOfWeek,
          periodNo: selectedSlot.periodNo,
        });
        setMessage("Permanent slot updated.");
        setPreview(null);
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  function handleRegenerate() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await regenerateScheduleForTeachersAction([]);
      if (result.success) {
        setMessage(`Schedule regenerated (v${result.slotCount} slots).`);
        window.location.reload();
      } else {
        setError(result.errors.join("; "));
      }
    });
  }

  if (slots.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Permanent Schedule Edit</CardTitle>
          <Button variant="outline" size="sm" disabled={pending} onClick={handleRegenerate}>
            Regenerate Full Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-2">
          Edit base weekly slots permanently. Temporary leave/swap changes are not affected.
          Preview conflicts before saving.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Slot</Label>
            <Select
              value={selectedSlotId}
              onValueChange={(v) => {
                setSelectedSlotId(v);
                setPreview(null);
                const slot = slots.find((s) => s.id === v);
                if (slot) setTeacherId(slot.teacherId);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select a slot" /></SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {DAYS[s.dayOfWeek]} P{s.periodNo} — {s.subject.name} ({s.classSection.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Teacher</Label>
            <Select value={teacherId} onValueChange={(v) => { setTeacherId(v); setPreview(null); }}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedSlot && (
          <p className="text-xs text-text-2">
            Current: {teacherName(selectedSlot.teacherId)}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pending || !selectedSlot || !teacherId} onClick={handlePreview}>
            Preview Conflicts
          </Button>
          <Button
            disabled={pending || !selectedSlot || !teacherId || preview?.hasConflict}
            onClick={handleSave}
          >
            Save Permanent Change
          </Button>
        </div>

        {preview && (
          <div className="rounded-[var(--radius-sm)] border border-border p-3">
            {preview.hasConflict ? (
              <Badge variant="danger" hideIcon>Conflict: {preview.conflictMessage}</Badge>
            ) : (
              <Badge variant="success" hideIcon>No conflicts — safe to save</Badge>
            )}
          </div>
        )}

        {message && <p className="text-sm text-success">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
