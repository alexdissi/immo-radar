"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotionListing, NotionStatus } from "./types";

const notionKey = ["notion"] as const;

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
  return json as T;
}

export function useNotionStatus() {
  return useQuery({ queryKey: notionKey, queryFn: () => request<NotionStatus>("/api/notion") });
}

export function useNotionDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => request<NotionStatus>("/api/notion", { method: "DELETE" }),
    onSuccess: (status) => queryClient.setQueryData(notionKey, status),
  });
}

export function useAddFavoriteToNotion() {
  return useMutation({
    mutationFn: (listing: NotionListing) =>
      request<{ url: string; created: boolean }>("/api/notion/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listing),
      }),
  });
}

export function useRemoveFavoriteFromNotion() {
  return useMutation({
    mutationFn: (url: string) =>
      request<{ removed: number }>("/api/notion/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }),
  });
}
