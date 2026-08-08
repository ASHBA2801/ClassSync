"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateJobTypeConfigAction, updateJobTypeLeaveAllowanceAction } from "@/actions/employees";
import type { EmployeeJobType } from "@prisma/client";
import { JOB_TYPE_LABELS, JOB_CATEGORY_LABELS, getJobTypesByCategory, type JobCategory } from "@/lib/employees/job-types";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  configs: {
    jobType: EmployeeJobType;
    isEnabled: boolean;
    minimumLeaves: number;
    leaveAllowancePeriod: "MONTH" | "YEAR";
  }[];
}

export function JobTypeSettings({ configs }: Props) {
  const router = useRouter();
  const configMap = new Map(configs.map((c) => [c.jobType, c]));
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(
      configs.map((config) => [
        config.jobType,
        {
          minimumLeaves: config.minimumLeaves,
          leaveAllowancePeriod: config.leaveAllowancePeriod,
        },
      ]),
    ),
  );
  const [savingJobType, setSavingJobType] = useState<EmployeeJobType | null>(null);

  async function toggle(jobType: EmployeeJobType, isEnabled: boolean) {
    await updateJobTypeConfigAction(jobType, isEnabled);
    router.refresh();
  }

  async function saveLeaveAllowance(jobType: EmployeeJobType) {
    const draft = drafts[jobType];
    if (!draft) return;
    setSavingJobType(jobType);
    await updateJobTypeLeaveAllowanceAction(
      jobType,
      Math.max(0, Number(draft.minimumLeaves) || 0),
      draft.leaveAllowancePeriod,
    );
    setSavingJobType(null);
    router.refresh();
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(Object.keys(JOB_CATEGORY_LABELS) as JobCategory[]).map((category) => (
        <div key={category} className="glass-card p-4 sm:p-5">
          <h3 className="mb-4 font-semibold text-text-1">{JOB_CATEGORY_LABELS[category]}</h3>
          <div className="space-y-4">
            {getJobTypesByCategory(category).map((jobType) => {
              const config = configMap.get(jobType);
              const draft = drafts[jobType] ?? {
                minimumLeaves: 0,
                leaveAllowancePeriod: "MONTH" as const,
              };

              return (
                <div key={jobType} className="space-y-3 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <label className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-text-1">{JOB_TYPE_LABELS[jobType]}</span>
                    <Switch
                      checked={config?.isEnabled ?? true}
                      onCheckedChange={(checked) => toggle(jobType, checked)}
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div className="space-y-1">
                      <Label htmlFor={`${jobType}-minimum-leaves`} className="text-xs text-text-2">
                        Minimum leaves
                      </Label>
                      <Input
                        id={`${jobType}-minimum-leaves`}
                        type="number"
                        min={0}
                        value={draft.minimumLeaves}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [jobType]: {
                              ...draft,
                              minimumLeaves: Number(event.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-text-2">Allowance period</Label>
                      <Select
                        value={draft.leaveAllowancePeriod}
                        onValueChange={(value: "MONTH" | "YEAR") =>
                          setDrafts((current) => ({
                            ...current,
                            [jobType]: {
                              ...draft,
                              leaveAllowancePeriod: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTH">Per month</SelectItem>
                          <SelectItem value="YEAR">Per calendar year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingJobType === jobType}
                      onClick={() => saveLeaveAllowance(jobType)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
