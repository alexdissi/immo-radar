/**
 * Contract between the Immo Radar web app and this extension. Types only: the web app
 * imports this file directly, so it must stay free of runtime code and extension APIs.
 */

/** window.postMessage channel shared by the web app and the bridge content script. */
export type BridgeChannel = "immo-radar";

export type ProviderId = "bienici" | "seloger" | "logicimmo" | "pap" | "leboncoin";
export type Status = "" | "favorite" | "visit" | "rejected";
export type City =
  | "paris"
  | "vincennes"
  | "saint-mande"
  | "saint-maur"
  | "boulogne"
  | "issy"
  | "levallois"
  | "neuilly";

/** A listing as scraped from a provider. */
export interface ListingInput {
  source: ProviderId;
  externalId: string;
  url: string;
  title: string;
  price: number;
  priceNet?: number;
  surface: number;
  carrez?: number;
  rooms: number;
  floor?: number | null;
  dpe?: string;
  charges?: number;
  zip: string;
  city?: string;
  district?: string;
  description: string;
  photos: string[];
}

/** A stored listing: provider data plus the user's own triage. */
export interface StoredListing extends ListingInput {
  id: string;
  firstSeen: string;
  status: Status;
  note: string;
}

/** What providers are asked for. */
export interface SearchCriteria {
  providers: ProviderId[];
  cities: City[];
  /** Paris arrondissements; empty = all of Paris. */
  arrondissements: number[];
  maxPrice: number;
  minArea: number;
  minRooms: number;
  maxRooms: number;
  maxDpe: string;
  maxPagesPerProvider: number;
}

export interface ProviderReport {
  provider: ProviderId;
  fetched: number;
  added: number;
  error?: string;
}

export interface Settings {
  /** Autopilot period in minutes, 0 = disabled. */
  scheduleMinutes: number;
  /** Last criteria sent by the web app, reused by scheduled searches. */
  criteria: SearchCriteria | null;
  /** Outcome of the last autopilot run. */
  lastRun: { at: string; added: number; failed: ProviderId[] } | null;
}

/** Request → response pairs handled by the background service worker. */
export interface ExtensionApi {
  ping: { request: Record<string, never>; response: { version: string } };
  "listings:list": { request: Record<string, never>; response: StoredListing[] };
  "listings:update": { request: { id: string; status: Status; note?: string }; response: StoredListing };
  "search:start": { request: { criteria?: SearchCriteria }; response: { reports: ProviderReport[] } };
  "settings:get": { request: Record<string, never>; response: Settings };
  "settings:set": { request: Partial<Settings>; response: Settings };
}

export type ExtensionMethod = keyof ExtensionApi;
export type ExtensionParams<M extends ExtensionMethod> = ExtensionApi[M]["request"];
export type ExtensionResult<M extends ExtensionMethod> = ExtensionApi[M]["response"];

export interface ExtensionRequest<M extends ExtensionMethod = ExtensionMethod> {
  method: M;
  params: ExtensionParams<M>;
}

export type ExtensionResponse<M extends ExtensionMethod = ExtensionMethod> =
  | { ok: true; data: ExtensionResult<M> }
  | { ok: false; error: string };

/** Events pushed by the extension to the web app and the popup. */
export type ExtensionEvent =
  | { type: "search:progress"; message: string }
  | { type: "search:done"; reports: ProviderReport[] }
  | { type: "listings:changed" };

/** Envelope of window messages exchanged through the bridge. */
export type BridgeMessage =
  | { channel: BridgeChannel; direction: "to-extension"; id: string; request: ExtensionRequest }
  | { channel: BridgeChannel; direction: "to-page"; id: string; response: ExtensionResponse }
  | { channel: BridgeChannel; direction: "to-page"; event: ExtensionEvent };
