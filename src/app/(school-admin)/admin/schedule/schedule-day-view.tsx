"use client";

import { useState, useTransition } from "react";
import { getEffectiveScheduleAction } from "@/actions/smart-scheduler";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Period {
  periodNo: number;
  startTime: string;
  endTime: string;
}

interface EffectiveSlot {
  periodNo: number;
  dayOfWeek: number;
  teacherId: string;
  classSectionId: string;
  isAltered: boolean;
  originalTeacherId?: string;
  alterationType?: string;
  classSection?: { name: string };
  subject?: { name: string };
}

export function ScheduleDayView({ periods }: { periods: Period[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<EffectiveSlot[]>([]);
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  function loadSchedule(d: string) {
    startTransition(async () => {
      const result = await getEffectiveScheduleAction(d);
      setSlots(result.slots as EffectiveSlot[]);
      setTeacherMap(result.teacherMap);
      setLoaded(true);
    });
  }

  function handleDateChange(d: string) {
    setDate(d);
    if (d) loadSchedule(d);
  }

  const dayOfWeek = date
    ? (() => {
        const d = new Date(date);
        const day = d.getDay();
        return day === 0 ? 6 : day - 1;
      })()
    : 0;

  const daySlots = slots.filter((s) => s.dayOfWeek === dayOfWeek);
  const slotsByPeriod = new Map(daySlots.map((s) => [s.periodNo, s]));

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle>Day View</CardTitle>
            {loaded && (
              <Badge variant="outline">{DAYS[dayOfWeek]} — {date}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-48">
              <DatePicker value={date} onChange={handleDateChange} />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => loadSchedule(date)}
            >
              {pending ? "Loading…" : "Load"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/schedule/alterations">Alterations</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/schedule/swaps">Swaps</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!loaded ? (
          <p className="text-sm text-text-2 py-4 text-center">
            Select a date and click Load to view the effective schedule with substitutions.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Period</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((p) => {
                const slot = slotsByPeriod.get(p.periodNo);
                if (!slot) {
                  return (
                    <TableRow key={p.periodNo}>
                      <TableCell>P{p.periodNo}</TableCell>
                      <TableCell colSpan={4} className="text-text-2">—</TableCell>
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={p.periodNo} className={slot.isAltered ? "bg-warning/5" : undefined}>
                    <TableCell className="font-medium">P{p.periodNo}</TableCell>
                    <TableCell>{slot.subject?.name}</TableCell>
                    <TableCell className="text-text-2">{slot.classSection?.name}</TableCell>
                    <TableCell>{teacherMap[slot.teacherId] ?? slot.teacherId.slice(0, 8)}</TableCell>
                    <TableCell>
                      {slot.isAltered ? (
                        <Badge variant="warning" hideIcon>
                          {slot.alterationType === "LEAVE_SUBSTITUTION"
                            ? "Substitute"
                            : slot.alterationType === "SWAP"
                              ? "Swap"
                              : "Override"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" hideIcon>Normal</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
