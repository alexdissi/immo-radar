"use client";

import type { City } from "@extension/contract";
import { MapPin } from "lucide-react";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { SelectButton } from "@/components/ui/select";
import { CITIES, CITY_GROUPS } from "@/lib/cities";
import { CheckboxRow } from "./controls";

/** Multi-select of cities; at least one stays selected. */
export function CitySelect({ value, onChange }: { value: City[]; onChange: (cities: City[]) => void }) {
  const labels = CITIES.filter((c) => value.includes(c.value)).map((c) => c.label);
  const summary = labels.length > 2 ? `${labels[0]} +${labels.length - 1}` : labels.join(", ");

  return (
    <Popover>
      <PopoverTrigger render={<SelectButton className="w-52" aria-label="Villes" />}>
        <span className="flex items-center gap-2">
          <MapPin className="size-4 text-primary opacity-100" />
          <span className="truncate">{summary}</span>
        </span>
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-64">
        <CityChecklist value={value} onChange={onChange} />
      </PopoverPopup>
    </Popover>
  );
}

/** Cities grouped by area, as checkboxes; at least one stays selected. */
export function CityChecklist({ value, onChange }: { value: City[]; onChange: (cities: City[]) => void }) {
  function toggle(city: City, checked: boolean) {
    const next = checked ? [...value, city] : value.filter((c) => c !== city);
    if (next.length > 0) onChange(CITIES.map((c) => c.value).filter((c) => next.includes(c)));
  }

  return (
    <div className="flex flex-col gap-3">
      {CITY_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.08em]">{group.label}</p>
          {group.cities.map((c) => (
            <CheckboxRow key={c.value} label={c.label} checked={value.includes(c.value)} onChange={(checked) => toggle(c.value, checked)} />
          ))}
        </div>
      ))}
    </div>
  );
}
