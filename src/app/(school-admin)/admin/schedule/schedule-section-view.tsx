"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

interface ScheduleSlotRow {
  dayOfWeek: number;
  periodNo: number;
  teacherId: string;
  classSectionId: string;
  subject: { name: string };
  teacher?: { name: string };
}

export function ScheduleSectionView({
  sections,
  periods,
  workingDays,
  slots,
  teacherMap,
  initialSectionId,
}: {
  sections: SectionOption[];
  periods: Period[];
  workingDays: number[];
  slots: ScheduleSlotRow[];
  teacherMap: Record<string, string>;
  initialSectionId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    if (selectedSectionId) {
      localStorage.setItem("scheduleSectionId", selectedSectionId);
    }
  }, [selectedSectionId]);

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

  const visibleDays = workingDays.length > 0 ? workingDays : [0, 1, 2, 3, 4];

  const sectionSlots = useMemo(
    () => slots.filter((s) => s.classSectionId === selectedSectionId),
    [slots, selectedSectionId],
  );

  const slotMap = useMemo(() => {
    const map = new Map<string, ScheduleSlotRow>();
    for (const slot of sectionSlots) {
      map.set(`${slot.dayOfWeek}-${slot.periodNo}`, slot);
    }
    return map;
  }, [sectionSlots]);

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  function handleSectionChange(sectionId: string) {
    setSelectedSectionId(sectionId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", sectionId);
    router.replace(`/admin/schedule?${params.toString()}`, { scroll: false });
  }

  if (sections.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="py-8 text-center text-sm text-text-2">
          No class sections configured. Set up grades and sections first.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>Class Timetable</CardTitle>
            <Badge variant="outline">{selectedSection?.name ?? "Select class"}</Badge>
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedSectionId} onValueChange={handleSectionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select class section" />
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
        </div>
      </CardHeader>
      <CardContent>
        {periods.length === 0 ? (
          <p className="text-sm text-text-2 py-4 text-center">No periods configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Period</TableHead>
                  {visibleDays.map((day) => (
                    <TableHead key={day}>{DAY_NAMES[day] ?? `Day ${day}`}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.periodNo}>
                    <TableCell className="font-medium">
                      P{p.periodNo}
                      <span className="block text-xs text-text-2 font-normal">
                        {p.startTime}–{p.endTime}
                      </span>
                    </TableCell>
                    {visibleDays.map((day) => {
                      const slot = slotMap.get(`${day}-${p.periodNo}`);
                      return (
                        <TableCell key={day} className="text-xs align-top">
                          {slot ? (
                            <div>
                              <p className="font-medium text-text-1">{slot.subject.name}</p>
                              <p className="text-text-2">
                                {slot.teacher?.name ?? teacherMap[slot.teacherId] ?? "Teacher"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-danger">Empty</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="mt-3 text-xs text-text-2">
          Showing the full weekly timetable for the selected class. Teacher free periods are not
          shown here — they are managed in Schedule Setup rules.
        </p>
      </CardContent>
    </Card>
  );
}
