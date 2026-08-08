"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyWeekdayTemplateToMonthAction,
  resetCalendarDayToTemplateAction,
  setCalendarDayStatusAction,
} from "@/actions/school-calendar";
import {
  buildMonthGrid,
  type CalendarDayEntry,
} from "@/lib/calendar/working-days";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays, RotateCcw } from "lucide-react";

interface Props {
  year: number;
  month: number;
  days: CalendarDayEntry[];
  weekdayTemplate: number[];
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatSelectedLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkingDayCalendar({ year, month, days, weekdayTemplate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const gridCells = useMemo(
    () => buildMonthGrid(year, month, days, weekdayTemplate),
    [year, month, days, weekdayTemplate],
  );

  const selectedDay = selectedDate ? dayMap.get(selectedDate) ?? gridCells.find((cell) => cell.date === selectedDate) : null;

  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  function navigateMonth(offset: number) {
    const next = new Date(year, month - 1 + offset, 1);
    router.push(`/admin/calendar?year=${next.getFullYear()}&month=${next.getMonth() + 1}`);
  }

  function handleSelectDay(dateKey: string, inCurrentMonth: boolean) {
    if (!inCurrentMonth || pending) return;
    setSelectedDate(dateKey);
  }

  function runAction(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  function setDayStatus(isWorkingDay: boolean) {
    if (!selectedDate) return;
    runAction(() => setCalendarDayStatusAction(selectedDate, isWorkingDay));
  }

  function resetSelectedToTemplate() {
    if (!selectedDate) return;
    runAction(() => resetCalendarDayToTemplateAction(selectedDate));
  }

  function resetMonthToTemplate() {
    runAction(() => applyWeekdayTemplateToMonthAction(year, month));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="glass-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" disabled={pending} onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" disabled={pending} onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold text-text-1 sm:text-2xl">
              {MONTH_LABELS[month - 1]} {year}
            </h2>
          </div>
          <Button type="button" variant="outline" disabled={pending} onClick={resetMonthToTemplate}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset month to weekday template
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b border-border/60 bg-surface-nested/40">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-3 sm:text-sm"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr min-h-[640px] sm:min-h-[720px]">
          {gridCells.map((cell) => {
            const isSelected = selectedDate === cell.date;
            const isToday = cell.date === todayKey;

            return (
              <button
                key={cell.date}
                type="button"
                disabled={!cell.inCurrentMonth || pending}
                onClick={() => handleSelectDay(cell.date, cell.inCurrentMonth)}
                className={cn(
                  "relative min-h-[88px] border-b border-r border-border/50 p-2 text-left transition-colors sm:min-h-[104px] sm:p-3",
                  "hover:bg-surface-hover/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset",
                  !cell.inCurrentMonth && "bg-surface/20 text-text-3 opacity-50 cursor-default hover:bg-surface/20",
                  cell.inCurrentMonth && cell.isWorkingDay && "bg-success/8",
                  cell.inCurrentMonth && !cell.isWorkingDay && "bg-muted/10",
                  isSelected && "ring-2 ring-inset ring-primary/50 bg-primary/10",
                  isToday && cell.inCurrentMonth && "shadow-[inset_0_0_0_1px_rgba(96,165,250,0.45)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                      isToday && cell.inCurrentMonth && "bg-accent/15 text-accent",
                      isSelected && "bg-primary/20 text-primary",
                      !cell.inCurrentMonth && "text-text-3",
                    )}
                  >
                    {cell.dayNumber}
                  </span>
                  {cell.inCurrentMonth && cell.isOverride && (
                    <span className="h-2 w-2 rounded-full bg-accent" title="Manual override" />
                  )}
                </div>

                {cell.inCurrentMonth && (
                  <div className="mt-3 space-y-1">
                    <Badge
                      variant={cell.isWorkingDay ? "success" : "outline"}
                      hideIcon
                      className="px-2 py-0.5 text-[0.65rem] sm:text-xs"
                    >
                      {cell.isWorkingDay ? "Working" : "Leave"}
                    </Badge>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card h-fit p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-text-1">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Day settings</h3>
        </div>

        {selectedDay && selectedDate ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-2">Selected date</p>
              <p className="mt-1 text-base font-medium text-text-1">{formatSelectedLabel(selectedDate)}</p>
            </div>

            <div className="rounded-[var(--radius-md)] border border-border/60 bg-surface-nested/50 p-3">
              <p className="text-sm text-text-2">Current status</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={selectedDay.isWorkingDay ? "success" : "warning"} hideIcon>
                  {selectedDay.isWorkingDay ? "Working day" : "Non-working day"}
                </Badge>
                {selectedDay.isOverride ? (
                  <Badge variant="info" hideIcon>
                    Manual override
                  </Badge>
                ) : (
                  <Badge variant="outline" hideIcon>
                    From weekday template
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-text-1">Set day type</p>
              <Button
                type="button"
                className="w-full justify-start"
                disabled={pending || selectedDay.isWorkingDay}
                onClick={() => setDayStatus(true)}
              >
                Mark as working day
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={pending || !selectedDay.isWorkingDay}
                onClick={() => setDayStatus(false)}
              >
                Mark as non-working day
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-text-2"
                disabled={pending || !selectedDay.isOverride}
                onClick={resetSelectedToTemplate}
              >
                Use weekday template for this day
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-border/70 bg-surface-nested/30 p-6 text-center">
            <p className="text-sm text-text-2">
              Select a day in the calendar to mark it as a working day or non-working day.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-2 border-t border-border/60 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-3">Legend</p>
          <div className="flex flex-wrap gap-2 text-xs text-text-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-2.5 py-1">
              Working day
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 bg-muted/10">
              Non-working day
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Manual override
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
