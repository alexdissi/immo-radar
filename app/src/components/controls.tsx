"use client";

import type React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NumberInput({ label, value, step, suffix, onChange }: { label: string; value: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <Field className="gap-1.5">
      <FieldLabel className="text-muted-foreground text-xs">{label}</FieldLabel>
      <div className="relative w-full">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={step}
          value={value || ""}
          placeholder="—"
          onChange={(e) => onChange(Number(e.target.value))}
          className={suffix ? "pe-9" : undefined}
        />
        {suffix && <span className="-translate-y-1/2 pointer-events-none absolute end-3 top-1/2 text-muted-foreground text-xs">{suffix}</span>}
      </div>
    </Field>
  );
}

export function CheckboxRow({ label, checked, onChange }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Label className="flex cursor-pointer items-center gap-2.5 py-0.5 font-normal text-sm">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {label}
    </Label>
  );
}

export interface Option<T extends string | number> {
  value: T;
  label: React.ReactNode;
}

export function SimpleSelect<T extends string | number>({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Select items={options} value={value} onValueChange={(v) => v !== null && onChange(v as T)}>
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {options.map((o) => (
          <SelectItem key={String(o.value)} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
