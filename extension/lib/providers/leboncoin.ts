import type { SearchCriteria } from "~contract";
import { CITY_CODES } from "~lib/cities";
import { createTabProvider } from "./tab-provider";

const ORIGIN = "https://www.leboncoin.fr";
const APARTMENT = "2";
const REAL_ESTATE_SALES = "9";

/** Every ad is complete on the result pages, so no listing page is opened. */
export const leboncoin = createTabProvider({
  id: "leboncoin",
  label: "Leboncoin",
  mode: "navigate",
  searchUrls: (c) => Array.from({ length: c.maxPagesPerProvider }, (_, i) => searchUrl(c, i + 1)),
});

function searchUrl(c: SearchCriteria, page: number): string {
  const params = new URLSearchParams({
    category: REAL_ESTATE_SALES,
    real_estate_type: APARTMENT,
    locations: c.cities.map((city) => CITY_CODES[city].leboncoin).join(","),
  });
  if (c.maxPrice) params.set("price", `min-${c.maxPrice}`);
  if (c.minArea) params.set("square", `${c.minArea}-max`);
  if (c.minRooms || c.maxRooms) params.set("rooms", `${c.minRooms || "min"}-${c.maxRooms || "max"}`);
  if (page > 1) params.set("page", String(page));
  return `${ORIGIN}/recherche?${params}`;
}
