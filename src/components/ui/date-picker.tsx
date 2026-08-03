"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

interface DatePickerProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

function DatePicker({
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "dd-mm-yyyy",
  required,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolled;
  const selected = parseDate(value);

  function setValue(next: string) {
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
  }

  return (
    <>
      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required && !value ? true : undefined}
        />
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "glass-input h-10 w-full justify-between px-3 text-left font-normal hover:bg-surface-input",
              !selected && "text-text-3",
              className,
            )}
          >
            <span>{selected ? format(selected, "dd-MM-yyyy") : placeholder}</span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-text-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) {
                setValue(toIsoDate(date));
                setOpen(false);
              }
            }}
            defaultMonth={selected}
          />
          <div className="flex items-center justify-between border-t border-border-subtle px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-text-2 hover:text-text-1"
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => {
                setValue(toIsoDate(new Date()));
                setOpen(false);
              }}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

export { DatePicker };
