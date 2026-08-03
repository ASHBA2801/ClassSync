"use client";

import * as React from "react";
import { Eye, EyeOff, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileInputProps {
  name: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (file: File | null) => void;
}

function FileInput({ name, accept, required, disabled, className, onChange }: FileInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileName(file?.name ?? "");
    onChange?.(file);
  }

  function clearFile() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setFileName("");
    onChange?.(null);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        required={required && !fileName ? true : undefined}
        disabled={disabled}
        className="sr-only"
        onChange={handleChange}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="glass-input h-10 shrink-0 gap-2 border-border px-3 hover:bg-surface-hover"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 text-text-2" />
          Choose file
        </Button>
        {fileName ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-nested px-3 py-2 text-sm text-text-1">
            <span className="truncate">{fileName}</span>
            <button
              type="button"
              onClick={clearFile}
              className="shrink-0 rounded p-0.5 text-text-2 transition-colors hover:bg-surface-hover hover:text-text-1"
              aria-label="Remove file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-text-3">No file selected</span>
        )}
      </div>
    </div>
  );
}

export { FileInput };
