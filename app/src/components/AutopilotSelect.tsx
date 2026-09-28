"use client";

import type { Settings } from "@extension/contract";
import { Check, Zap } from "lucide-react";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { SelectButton } from "@/components/ui/select";
import { AUTOPILOT_MODES, autopilotMode } from "@/lib/autopilot";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  lastRun: Settings["lastRun"] | undefined;
  onChange: (minutes: number) => void;
}

export function AutopilotSelect({ value, lastRun, onChange }: Props) {
  const active = value > 0;
  return (
    <Popover>
      <PopoverTrigger render={<SelectButton className="w-44" aria-label="Autopilot" />}>
        <span className="flex items-center gap-2">
          <span className={cn("relative grid size-4 place-items-center", active ? "text-primary" : "text-muted-foreground")}>
            <Zap className="size-4" />
            {active && <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500 ring-2 ring-background" />}
          </span>
          Autopilot · {autopilotMode(value).short}
        </span>
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-72">
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-medium text-sm">Autopilot</p>
            <p className="text-muted-foreground text-xs">L'extension relance la recherche et te notifie des nouvelles annonces. Chrome doit rester ouvert.</p>
          </div>
          <div className="flex flex-col gap-0.5" role="radiogroup" aria-label="Fréquence">
            {AUTOPILOT_MODES.map((m) => (
              <button
                key={m.minutes}
                type="button"
                role="radio"
                aria-checked={value === m.minutes}
                onClick={() => onChange(m.minutes)}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                {m.label}
                {value === m.minutes && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
          {lastRun && (
            <p className="border-t pt-2 text-muted-foreground text-xs">
              Dernier passage le {new Date(lastRun.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} :{" "}
              {lastRun.added} nouvelle{lastRun.added > 1 ? "s" : ""} annonce{lastRun.added > 1 ? "s" : ""}
              {lastRun.failed.length > 0 && ` (${lastRun.failed.length} site${lastRun.failed.length > 1 ? "s" : ""} sauté${lastRun.failed.length > 1 ? "s" : ""})`}
            </p>
          )}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
