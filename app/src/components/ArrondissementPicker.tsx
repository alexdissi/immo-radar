"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => String(i + 1));

export function ArrondissementPicker({ value, onChange }: { value: number[]; onChange: (arrondissements: number[]) => void }) {
  return (
    <ToggleGroup
      multiple
      variant="outline"
      size="sm"
      className="grid w-full grid-cols-5 gap-1.5"
      value={value.map(String)}
      onValueChange={(v) => onChange(v.map(Number).sort((a, b) => a - b))}
    >
      {ARRONDISSEMENTS.map((n) => (
        <ToggleGroupItem
          key={n}
          value={n}
          aria-label={`${n}e arrondissement`}
          className="rounded-md! border! tabular-nums data-pressed:border-primary! data-pressed:bg-primary data-pressed:text-primary-foreground"
        >
          {n}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
