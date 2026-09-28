"use client";

import type { ProviderId } from "@extension/contract";
import { Globe } from "lucide-react";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { SelectButton } from "@/components/ui/select";
import { PROVIDERS, SOURCE_LABELS } from "@/lib/format";
import { CheckboxRow } from "./controls";
import { SourceIcon } from "./SourceIcon";

/** Which sites' listings are shown; at least one stays selected. */
export function SourceSelect({ value, onChange }: { value: ProviderId[]; onChange: (sources: ProviderId[]) => void }) {
  const summary = value.length === PROVIDERS.length ? "Tous les sites" : value.length === 1 ? SOURCE_LABELS[value[0]] : `${value.length} sites`;

  function toggle(source: ProviderId, checked: boolean) {
    const next = checked ? [...value, source] : value.filter((s) => s !== source);
    if (next.length > 0) onChange(PROVIDERS.filter((p) => next.includes(p)));
  }

  return (
    <Popover>
      <PopoverTrigger render={<SelectButton className="w-48" aria-label="Sites affichés" />}>
        <span className="flex min-w-0 items-center gap-2">
          {value.length === PROVIDERS.length ? (
            <Globe className="size-4 shrink-0" />
          ) : (
            <span className="flex shrink-0 -space-x-1">
              {value.slice(0, 3).map((s) => (
                <SourceIcon key={s} source={s} className="ring-2 ring-background" />
              ))}
            </span>
          )}
          <span className="truncate">{summary}</span>
        </span>
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-56">
        <div className="flex flex-col gap-1">
          {PROVIDERS.map((p) => (
            <CheckboxRow
              key={p}
              checked={value.includes(p)}
              onChange={(checked) => toggle(p, checked)}
              label={
                <span className="flex items-center gap-2">
                  <SourceIcon source={p} /> {SOURCE_LABELS[p]}
                </span>
              }
            />
          ))}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
