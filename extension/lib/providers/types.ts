import type { ListingInput, ProviderId, SearchCriteria } from "~contract";

export type Log = (message: string) => void;

export interface SearchOptions {
  /** A user is watching: sites asking for a human check are shown to them. Off for the autopilot. */
  interactive: boolean;
}

export interface Provider {
  id: ProviderId;
  label: string;
  /** Yields batches of listings as they are fetched. */
  search(criteria: SearchCriteria, log: Log, options: SearchOptions): AsyncGenerator<ListingInput[]>;
}
