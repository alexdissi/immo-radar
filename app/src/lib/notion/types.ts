import type { ProviderId } from "@extension/contract";

export interface NotionStatus {
  connected: boolean;
  workspaceName?: string;
  databaseUrl?: string;
}

/** A favorite listing as sent to Notion, computed by the dashboard. */
export interface NotionListing {
  title: string;
  url: string;
  source: ProviderId;
  location: string;
  district?: string;
  price: number;
  totalCost: number;
  pricePerM2: number;
  surface: number;
  rooms?: number;
  floor?: number | null;
  charges?: number;
  dpe?: string;
  highlights: string[];
  warnings: string[];
  description: string;
  photos: string[];
}
