"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Lock } from "lucide-react";

export interface SetupStepDef {
  id: number;
  label: string;
  href: string;
  complete: boolean;
  accessible: boolean;
}

export function SetupStepper({
  steps,
  currentStep,
}: {
  steps: SetupStepDef[];
  currentStep: number;
}) {
  return (
    <nav aria-label="Setup progress" className="mb-8">
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const Icon = step.complete ? CheckCircle2 : step.accessible ? Circle : Lock;

          return (
            <li key={step.id} className="flex items-center gap-2 flex-1">
              {index > 0 && (
                <div
                  className={cn(
                    "hidden sm:block h-px flex-1 mx-2",
                    steps[index - 1].complete ? "bg-success" : "bg-border",
                  )}
                />
              )}
              {step.accessible ? (
                <Link
                  href={step.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    isCurrent
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-text-2 hover:text-text-1 hover:bg-surface-2",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      step.complete ? "text-success" : isCurrent ? "text-primary" : "text-text-2",
                    )}
                  />
                  <span>
                    <span className="hidden md:inline">{step.id}. </span>
                    {step.label}
                  </span>
                </Link>
              ) : (
                <span className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-2 opacity-60 cursor-not-allowed">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="hidden md:inline">{step.id}. </span>
                    {step.label}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
