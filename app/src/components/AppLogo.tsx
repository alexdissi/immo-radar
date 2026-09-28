import { Radar } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground", className)}>
      <Radar className="size-4" />
    </span>
  );
}
