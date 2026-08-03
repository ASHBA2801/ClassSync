"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import "react-day-picker/style.css";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout="label"
      className={cn("glass-calendar p-3", className)}
      classNames={{
        months: "relative flex flex-col",
        month: "space-y-3",
        month_caption: "relative flex items-center justify-center py-1",
        caption_label: "text-sm font-semibold text-text-1",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "absolute left-1 top-0 h-8 w-8 text-text-2 hover:bg-surface-hover hover:text-text-1",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "absolute right-1 top-0 h-8 w-8 text-text-2 hover:bg-surface-hover hover:text-text-1",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-center text-[0.72rem] font-medium uppercase tracking-wide text-text-3",
        week: "mt-1 flex w-full",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] p-0 font-normal text-text-2 transition-colors",
          "hover:bg-surface-hover hover:text-text-1",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "aria-selected:opacity-100",
        ),
        selected:
          "[&>button]:bg-primary/20 [&>button]:font-medium [&>button]:text-primary [&>button]:hover:bg-primary/25",
        today: "[&>button]:border [&>button]:border-accent/40 [&>button]:text-accent",
        outside: "[&>button]:text-text-3 [&>button]:opacity-50",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("h-4 w-4", chevronClassName)} {...chevronProps} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
