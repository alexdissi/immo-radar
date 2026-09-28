import { CITIES, cityOfZip } from "@/lib/cities";
import { PROVIDERS } from "@/lib/format";
import { computeCosts, DEFAULT_FINANCING } from "./costs";
import { detectHighlights, detectWarnings, extractCarrez, HIGHLIGHT_LABELS, mentionsGroundFloor, RENOVATION_HIGHLIGHTS } from "./rules";
import type { SearchCriteria, StoredListing } from "@extension/contract";
import type { Financing, Listing, Query, SortKey } from "./types";

const DPE_SCALE = "ABCDEFG";
const DAY_MS = 86_400_000;

export const DEFAULT_QUERY: Query = {
  minPrice: 0,
  maxPrice: 250000,
  maxPricePerM2: 0,
  minArea: 20,
  minRooms: 0,
  maxRooms: 2,
  maxCharges: 0,
  arrondissements: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16],
  cities: ["paris"],
  sources: PROVIDERS,
  maxDpe: "E",
  allowUnknownDpe: true,
  excludeGroundFloor: true,
  minFloor: 0,
  topFloorOnly: false,
  outdoorOnly: false,
  hideWarnings: true,
  renovatedOnly: false,
  text: "",
  excludeText: "",
  newWithinDays: 0,
  status: "active",
  sortBy: "price",
};

export function arrondissementOf(zip: string): number {
  return /^750\d\d$/.test(zip) ? Number(zip.slice(3)) : 0;
}

/** Computes everything derived from a stored listing (warnings, Carrez, costs…). */
export function enrich(l: StoredListing, financing: Financing = DEFAULT_FINANCING): Listing {
  const text = `${l.title} ${l.description}`;
  const carrez = l.carrez || extractCarrez(text);
  return {
    ...l,
    ...computeCosts(l.price, l.priceNet, financing),
    carrez,
    arrondissement: arrondissementOf(l.zip),
    warnings: detectWarnings(text),
    highlights: detectHighlights(text),
    groundFloor: l.floor === 0 || mentionsGroundFloor(text),
    livingArea: carrez > 5 && (!l.surface || carrez < l.surface) ? carrez : l.surface,
    copies: [],
  };
}

export function runQuery(stored: StoredListing[], q: Query, financing: Financing = DEFAULT_FINANCING): Listing[] {
  return stored
    .map((l) => enrich(l, financing))
    .reduce(mergeDuplicates, [] as Listing[])
    .filter((l) => matches(l, q))
    .sort(SORTERS[q.sortBy] ?? SORTERS.price);
}

const SAME_PRICE_TOLERANCE = 0.02;
const SAME_SURFACE_TOLERANCE_M2 = 1;

/** Same property on several sites: same zip and rooms, surface and price within tolerance, compatible DPE. */
export function isSameProperty(a: Listing, b: Listing): boolean {
  return (
    a.source !== b.source &&
    a.zip !== "" &&
    a.zip === b.zip &&
    a.livingArea > 0 &&
    (!a.rooms || !b.rooms || a.rooms === b.rooms) &&
    Math.abs(a.livingArea - b.livingArea) <= SAME_SURFACE_TOLERANCE_M2 &&
    Math.abs(a.price - b.price) <= SAME_PRICE_TOLERANCE * Math.max(a.price, b.price) &&
    (!a.dpe || !b.dpe || a.dpe.toUpperCase() === b.dpe.toUpperCase())
  );
}

/** Folds duplicates into one card: the listing the user triaged, else the most complete one. */
function mergeDuplicates(groups: Listing[], listing: Listing): Listing[] {
  const index = groups.findIndex((g) => [g, ...g.copies].every((c) => c.source !== listing.source) && isSameProperty(g, listing));
  if (index < 0) return [...groups, listing];
  const group = groups[index];
  const [primary, secondary] = rank(listing) > rank(group) ? [listing, group] : [group, listing];
  const copies = [...group.copies, toCopy(secondary)].filter((c) => c.id !== primary.id);
  groups[index] = { ...primary, copies };
  return groups;
}

const toCopy = (l: Listing) => ({ id: l.id, source: l.source, url: l.url });

function rank(l: Listing): number {
  const triaged = l.status ? 1000 : 0;
  return triaged + Math.min(l.description.length, 500) / 10 + l.photos.length * 2 + (l.dpe ? 5 : 0) + (l.charges ? 5 : 0);
}

function matches(l: Listing, q: Query): boolean {
  return (
    matchesLocation(l, q) &&
    !(q.minPrice && l.price < q.minPrice) &&
    !(q.maxPrice && l.price > q.maxPrice) &&
    !(q.maxPricePerM2 && pricePerM2(l) > q.maxPricePerM2) &&
    !(q.minArea && l.livingArea < q.minArea) &&
    !(q.minRooms && l.rooms && l.rooms < q.minRooms) &&
    !(q.maxRooms && l.rooms > q.maxRooms) &&
    !(q.maxCharges && (l.charges ?? 0) > q.maxCharges) &&
    !(q.excludeGroundFloor && l.groundFloor) &&
    !(q.minFloor && (l.floor == null || l.floor < q.minFloor)) &&
    !(q.topFloorOnly && !l.highlights.includes(HIGHLIGHT_LABELS.topFloor)) &&
    !(q.outdoorOnly && !l.highlights.includes(HIGHLIGHT_LABELS.outdoor)) &&
    !(q.hideWarnings && l.warnings.length > 0) &&
    !(q.renovatedOnly && !l.highlights.some((h) => RENOVATION_HIGHLIGHTS.has(h))) &&
    !(q.newWithinDays && Date.now() - Date.parse(l.firstSeen) > q.newWithinDays * DAY_MS) &&
    matchesDpe(l.dpe, q) &&
    [l, ...l.copies].some((c) => q.sources.includes(c.source)) &&
    matchesStatus(l, q) &&
    matchesText(l, q)
  );
}

function matchesLocation(l: Listing, q: Query): boolean {
  if (l.arrondissement) return q.cities.includes("paris") && (q.arrondissements.length === 0 || q.arrondissements.includes(l.arrondissement));
  const city = cityOfZip(l.zip);
  return city !== undefined && q.cities.includes(city);
}

function matchesDpe(dpe: string | undefined, q: Query): boolean {
  if (!q.maxDpe) return true;
  const rank = dpe?.length === 1 ? DPE_SCALE.indexOf(dpe.toUpperCase()) : -1;
  return rank < 0 ? q.allowUnknownDpe : rank <= DPE_SCALE.indexOf(q.maxDpe);
}

function matchesStatus(l: Listing, q: Query): boolean {
  if (q.status === "all") return true;
  if (q.status === "active") return l.status !== "rejected";
  return l.status === q.status;
}

/** Every word of `text` must appear; none of the comma-separated `excludeText` terms may. */
function matchesText(l: Listing, q: Query): boolean {
  const haystack = `${l.title} ${l.description} ${l.district ?? ""}`.toLowerCase();
  const required = q.text.toLowerCase().split(/\s+/).filter(Boolean);
  const excluded = q.excludeText.toLowerCase().split(",").map((t) => t.trim()).filter(Boolean);
  return required.every((w) => haystack.includes(w)) && !excluded.some((t) => haystack.includes(t));
}

const pricePerM2 = (l: Listing) => (l.livingArea ? l.price / l.livingArea : l.price);
const quality = (l: Listing) => l.highlights.length - 2 * l.warnings.length;

const SORTERS: Record<SortKey, (a: Listing, b: Listing) => number> = {
  price: (a, b) => a.price - b.price,
  pricePerM2: (a, b) => pricePerM2(a) - pricePerM2(b),
  area: (a, b) => b.livingArea - a.livingArea,
  quality: (a, b) => quality(b) - quality(a),
  newest: (a, b) => Date.parse(b.firstSeen) - Date.parse(a.firstSeen),
};

// Providers stop earlier when a page brings nothing new; known listings are never reopened.
const MAX_PAGES_PER_PROVIDER = 10;

/** A search always covers every site; `sources` only filters what is displayed. */
export function toSearchCriteria(q: Query): SearchCriteria {
  return {
    providers: PROVIDERS,
    arrondissements: q.arrondissements,
    cities: q.cities,
    maxPrice: q.maxPrice,
    minArea: q.minArea,
    minRooms: q.minRooms,
    maxRooms: q.maxRooms,
    maxDpe: q.maxDpe,
    maxPagesPerProvider: MAX_PAGES_PER_PROVIDER,
  };
}

const CITY_VALUES: ReadonlySet<string> = new Set(CITIES.map((c) => c.value));

/** Keeps only known fields with the right type; anything else falls back to the default. */
export function sanitizeQuery(input: unknown): Query {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const query = { ...DEFAULT_QUERY };
  for (const key of Object.keys(DEFAULT_QUERY) as (keyof Query)[]) {
    const value = raw[key];
    if (typeof value === typeof DEFAULT_QUERY[key] && !Array.isArray(DEFAULT_QUERY[key])) Object.assign(query, { [key]: value });
  }
  if (Array.isArray(raw.arrondissements)) {
    query.arrondissements = raw.arrondissements.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 20);
  }
  if (Array.isArray(raw.cities)) {
    const cities = raw.cities.filter((c): c is Query["cities"][number] => typeof c === "string" && CITY_VALUES.has(c));
    if (cities.length) query.cities = cities;
  }
  if (Array.isArray(raw.sources)) {
    const sources = raw.sources.filter((p): p is Query["sources"][number] => typeof p === "string" && (PROVIDERS as string[]).includes(p));
    if (sources.length) query.sources = sources;
  }
  if (!(query.sortBy in SORTERS)) query.sortBy = DEFAULT_QUERY.sortBy;
  if (!["active", "favorite", "visit", "rejected", "all"].includes(query.status)) query.status = DEFAULT_QUERY.status;
  if (query.maxDpe && !DPE_SCALE.includes(query.maxDpe)) query.maxDpe = DEFAULT_QUERY.maxDpe;
  return query;
}
