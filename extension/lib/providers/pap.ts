import type { SearchCriteria } from "~contract";
import { CITY_CODES } from "~lib/cities";
import { createTabProvider } from "./tab-provider";

const ORIGIN = "https://www.pap.fr";


export const pap = createTabProvider({
  id: "pap",
  label: "PAP",
  mode: "navigate",
  searchUrls: (c) =>
    c.cities.map((city) => CITY_CODES[city].pap).flatMap((location) =>
      Array.from({ length: c.maxPagesPerProvider }, (_, i) => searchUrl(location, c, i + 1)),
    ),
});

// PAP encodes the search in the path, e.g.
// /annonce/vente-appartements-paris-75-g439-jusqu-a-250000-euros-a-partir-de-20-m2-2
function searchUrl(location: string, c: SearchCriteria, page: number): string {
  const parts = [`vente-appartements-${location}`];
  if (c.maxPrice) parts.push(`jusqu-a-${c.maxPrice}-euros`);
  if (c.minArea) parts.push(`a-partir-de-${c.minArea}-m2`);
  if (page > 1) parts.push(String(page));
  return `${ORIGIN}/annonce/${parts.join("-")}`;
}
