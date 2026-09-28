import type { City, ProviderId, StoredListing } from "@extension/contract";

/** The same property published on another site. */
export interface ListingCopy {
  id: string;
  source: ProviderId;
  url: string;
}

export interface Financing {
  downPayment: number;
  ratePct: number;
  years: number;
  insurancePct: number;
  netIncome: number;
}

export interface Costs {
  notaryFees: number;
  loanGuaranty: number;
  totalCost: number;
  loan: number;
  monthly: number;
  debtRatio: number;
}

export interface Insights extends Costs {
  arrondissement: number;
  warnings: string[];
  highlights: string[];
  groundFloor: boolean;
  livingArea: number;
  carrez: number;
}

/** A stored listing with everything computed from it. */
export type Listing = StoredListing & Insights & { copies: ListingCopy[] };

export type SortKey = "price" | "pricePerM2" | "area" | "quality" | "newest";

/** Filters applied to stored listings. */
export interface Query {
  minPrice: number;
  maxPrice: number;
  maxPricePerM2: number;
  minArea: number;
  minRooms: number;
  maxRooms: number;
  maxCharges: number;
  arrondissements: number[];
  cities: City[];
  /** Sites whose listings are shown. */
  sources: ProviderId[];
  maxDpe: string;
  allowUnknownDpe: boolean;
  excludeGroundFloor: boolean;
  minFloor: number;
  topFloorOnly: boolean;
  outdoorOnly: boolean;
  hideWarnings: boolean;
  renovatedOnly: boolean;
  text: string;
  excludeText: string;
  newWithinDays: number;
  /** "active" = everything but rejected listings. */
  status: Exclude<StoredListing["status"], ""> | "active" | "all";
  sortBy: SortKey;
}
