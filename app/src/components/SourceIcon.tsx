import type { ProviderId } from "@extension/contract";
import { SOURCE_LABELS, sourceIcon } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SourceIcon({ source, className }: { source: ProviderId; className?: string }) {
  return <img src={sourceIcon(source)} alt={SOURCE_LABELS[source]} referrerPolicy="no-referrer" className={cn("size-4 shrink-0 rounded-[4px]", className)} />;
}
