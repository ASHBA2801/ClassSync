"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getEffectiveScheduleAction } from "@/actions/smart-scheduler";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Period {
  periodNo: number;
  startTime: string;
  endTime: string;
}

interface SectionOption {
  id: string;
  name: string;
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

export function ScheduleDayView({
  periods,
  sections,
  workingDays,
  initialSectionId,
}: {
  periods: Period[];
  sections: SectionOption[];
  workingDays: number[];
  initialSectionId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<EffectiveSlot[]>([]);
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedSectionId, setSelectedSectionId] = useState(
    initialSectionId ?? sections[0]?.id ?? "",
  );

  useEffect(() => {
    const fromUrl = searchParams.get("section");
    if (fromUrl && sections.some((s) => s.id === fromUrl)) {
      setSelectedSectionId(fromUrl);
    }
  }, [searchParams, sections]);

  useEffect(() => {
    if (!selectedSectionId && sections[0]) {
      const stored = localStorage.getItem("scheduleSectionId");
      if (stored && sections.some((s) => s.id === stored)) {
        setSelectedSectionId(stored);
      } else {
        setSelectedSectionId(sections[0].id);
      }
    }
  }, [sections, selectedSectionId]);

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

  function handleSectionChange(sectionId: string) {
    setSelectedSectionId(sectionId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", sectionId);
    router.replace(`/admin/schedule?${params.toString()}`, { scroll: false });
  }

  const dayOfWeek = date
    ? (() => {
        const d = new Date(date);
        const day = d.getDay();
        return day === 0 ? 6 : day - 1;
      })()
    : 0;

  const isWorkingDay = workingDays.length === 0 || workingDays.includes(dayOfWeek);

  const daySlots = useMemo(() => {
    const filtered = slots.filter(
      (s) => s.dayOfWeek === dayOfWeek && s.classSectionId === selectedSectionId,
    );
    const map = new Map<number, EffectiveSlot>();
    for (const slot of filtered) {
      map.set(slot.periodNo, slot);
    }
    return map;
  }, [slots, dayOfWeek, selectedSectionId]);

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Day View</CardTitle>
            {loaded && (
              <Badge variant="outline">
                {DAY_NAMES[dayOfWeek]} — {date}
              </Badge>
            )}
            {selectedSection && <Badge variant="outline">{selectedSection.name}</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sections.length > 0 && (
              <div className="w-48">
                <Select value={selectedSectionId} onValueChange={handleSectionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
        ) : !isWorkingDay ? (
          <p className="text-sm text-text-2 py-4 text-center">
            {DAY_NAMES[dayOfWeek]} is not a working day for this school.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Period</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((p) => {
                const slot = daySlots.get(p.periodNo);
                if (!slot) {
                  return (
                    <TableRow key={p.periodNo}>
                      <TableCell>P{p.periodNo}</TableCell>
                      <TableCell colSpan={3} className="text-text-2">
                        —
                      </TableCell>
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={p.periodNo} className={slot.isAltered ? "bg-warning/5" : undefined}>
                    <TableCell className="font-medium">P{p.periodNo}</TableCell>
                    <TableCell>{slot.subject?.name}</TableCell>
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
                        <Badge variant="outline" hideIcon>
                          Normal
                        </Badge>
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
