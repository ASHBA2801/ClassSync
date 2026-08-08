"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SalaryComponentMap } from "@/lib/employees/salary";

interface ComponentRow {
  name: string;
  amount: string;
}

interface Props {
  allowances: SalaryComponentMap;
  deductions: SalaryComponentMap;
  onAllowancesChange: (value: SalaryComponentMap) => void;
  onDeductionsChange: (value: SalaryComponentMap) => void;
}

function mapToRows(map: SalaryComponentMap): ComponentRow[] {
  const entries = Object.entries(map);
  if (entries.length === 0) return [{ name: "", amount: "" }];
  return entries.map(([name, amount]) => ({ name, amount: String(amount) }));
}

function rowsToMap(rows: ComponentRow[]): SalaryComponentMap {
  const result: SalaryComponentMap = {};
  for (const row of rows) {
    const name = row.name.trim();
    const amount = Number(row.amount);
    if (name && Number.isFinite(amount) && amount >= 0) {
      result[name] = amount;
    }
  }
  return result;
}

function ComponentList({
  label,
  rows,
  onChange,
}: {
  label: string;
  rows: ComponentRow[];
  onChange: (rows: ComponentRow[]) => void;
}) {
  function updateRow(index: number, field: keyof ComponentRow, value: string) {
    const next = rows.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    onChange(next);
  }

  function addRow() {
    onChange([...rows, { name: "", amount: "" }]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {rows.map((row, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder="Name (e.g. HRA)"
            value={row.name}
            onChange={(e) => updateRow(index, "name", e.target.value)}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={row.amount}
            onChange={(e) => updateRow(index, "amount", e.target.value)}
            className="w-32"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => removeRow(index)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        Add {label.slice(0, -1)}
      </Button>
    </div>
  );
}

export function SalaryComponentsEditor({
  allowances,
  deductions,
  onAllowancesChange,
  onDeductionsChange,
}: Props) {
  const allowanceRows = mapToRows(allowances);
  const deductionRows = mapToRows(deductions);

  return (
    <div className="space-y-4">
      <ComponentList
        label="Allowances"
        rows={allowanceRows}
        onChange={(rows) => onAllowancesChange(rowsToMap(rows))}
      />
      <ComponentList
        label="Deductions"
        rows={deductionRows}
        onChange={(rows) => onDeductionsChange(rowsToMap(rows))}
      />
    </div>
  );
}

export function emptySalaryComponents(): { allowances: SalaryComponentMap; deductions: SalaryComponentMap } {
  return { allowances: {}, deductions: {} };
}
