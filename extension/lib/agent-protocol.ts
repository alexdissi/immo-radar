import type { ListingInput } from "~contract";

/** Sites browsed through a real tab because they reject service-worker requests. */
export type Site = "seloger" | "logicimmo" | "pap" | "leboncoin";

export interface ListingRef {
  externalId: string;
  url: string;
}

/** What a search page yields: links to open, and/or listings already complete. */
export interface SearchPage {
  refs: ListingRef[];
  listings: Partial<ListingInput>[];
}

export type AgentRequest =
  | { type: "agent:ping" }
  /** Fetch mode: the agent requests pages itself, same-origin. */
  | { type: "agent:fetch-search"; site: Site; url: string }
  | { type: "agent:fetch-details"; site: Site; refs: ListingRef[] }
  /** Navigation mode: the tab was navigated to the page, the agent reads it. */
  | { type: "agent:read-search"; site: Site }
  | { type: "agent:read-detail"; site: Site; ref: ListingRef };

export type AgentResult<T> = { ok: true; data: T } | { ok: false; blocked: boolean; error: string };
