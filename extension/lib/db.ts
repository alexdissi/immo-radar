import { openDB, type DBSchema } from "idb";
import type { ListingInput, ProviderId, Status, StoredListing } from "~contract";

interface ImmoRadarDB extends DBSchema {
  listings: { key: string; value: StoredListing };
}

const dbPromise = openDB<ImmoRadarDB>("immo-radar", 1, {
  upgrade(db) {
    db.createObjectStore("listings", { keyPath: "id" });
  },
});

export const listingId = (source: ProviderId, externalId: string) => `${source}:${externalId}`;

/** Inserts or refreshes listings; the user's triage (status, note, first seen) is kept. */
export async function upsertListings(inputs: ListingInput[]): Promise<number> {
  const tx = (await dbPromise).transaction("listings", "readwrite");
  let added = 0;
  for (const input of inputs) {
    const id = listingId(input.source, input.externalId);
    const previous = await tx.store.get(id);
    if (!previous) added++;
    await tx.store.put({
      ...input,
      id,
      firstSeen: previous?.firstSeen ?? new Date().toISOString(),
      status: previous?.status ?? "",
      note: previous?.note ?? "",
    });
  }
  await tx.done;
  return added;
}

export async function allListings(): Promise<StoredListing[]> {
  return (await dbPromise).getAll("listings");
}

export async function knownIds(ids: string[]): Promise<Set<string>> {
  const db = await dbPromise;
  const found = await Promise.all(ids.map((id) => db.getKey("listings", id)));
  return new Set(found.filter((id): id is string => id !== undefined));
}

export async function updateListing(id: string, status: Status, note?: string): Promise<StoredListing> {
  const db = await dbPromise;
  const listing = await db.get("listings", id);
  if (!listing) throw new Error("Annonce introuvable");
  const updated = { ...listing, status, note: note ?? listing.note };
  await db.put("listings", updated);
  return updated;
}
