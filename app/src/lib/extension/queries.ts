"use client";

import type { SearchCriteria, Status, StoredListing } from "@extension/contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { callExtension, onExtensionEvent } from "./bridge";

const PING_TIMEOUT_MS = 1500;

/** Oldest extension that knows every provider and message the app uses. */
export const MIN_EXTENSION_VERSION = "1.3.0";

export const isOutdated = (version: string) => compareVersions(version, MIN_EXTENSION_VERSION) < 0;

function compareVersions(a: string, b: string): number {
  const [pa, pb] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

export const extensionKeys = {
  ping: ["extension", "ping"] as const,
  listings: ["extension", "listings"] as const,
  settings: ["extension", "settings"] as const,
};

/** Installed extension version, or null when it is not detected. */
export function useExtensionVersion() {
  return useQuery({
    queryKey: extensionKeys.ping,
    queryFn: () =>
      callExtension("ping", {}, PING_TIMEOUT_MS)
        .then((r) => r.version)
        .catch(() => null),
    staleTime: 30_000,
  });
}

export function useListings(enabled: boolean) {
  return useQuery({
    queryKey: extensionKeys.listings,
    queryFn: () => callExtension("listings:list", {}),
    enabled,
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) => callExtension("listings:update", { id, status }),
    onMutate: ({ id, status }) => {
      queryClient.setQueryData<StoredListing[]>(extensionKeys.listings, (listings) =>
        listings?.map((l) => (l.id === id ? { ...l, status } : l)),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: extensionKeys.listings }),
  });
}

export function useSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (criteria: SearchCriteria) => callExtension("search:start", { criteria }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: extensionKeys.listings }),
  });
}

/** Subscribes to extension events: refreshes listings and returns the last progress line. */
export function useSearchProgress(): string {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState("");
  useEffect(
    () =>
      onExtensionEvent((event) => {
        if (event.type === "search:progress") setProgress(event.message);
        if (event.type === "search:done") {
          setProgress("");
          queryClient.invalidateQueries({ queryKey: extensionKeys.settings });
        }
        if (event.type === "listings:changed") queryClient.invalidateQueries({ queryKey: extensionKeys.listings });
      }),
    [queryClient],
  );
  return progress;
}

export function useExtensionSettings(enabled: boolean) {
  return useQuery({
    queryKey: extensionKeys.settings,
    queryFn: () => callExtension("settings:get", {}),
    enabled,
  });
}

/** Keeps the extension's autopilot period and criteria in line with the saved preferences. */
export function useAutopilotSync(enabled: boolean, scheduleMinutes: number, criteria: SearchCriteria) {
  const queryClient = useQueryClient();
  const serialized = JSON.stringify(criteria);
  useEffect(() => {
    if (!enabled) return;
    callExtension("settings:set", { scheduleMinutes, criteria: JSON.parse(serialized) })
      .then((settings) => queryClient.setQueryData(extensionKeys.settings, settings))
      .catch(() => {});
  }, [enabled, scheduleMinutes, serialized, queryClient]);
}
