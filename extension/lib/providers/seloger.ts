import type { SearchCriteria } from "~contract";
import { CITY_CODES } from "~lib/cities";
import { createTabProvider } from "./tab-provider";

const DPE_SCALE = "ABCDEFG";

// Paris arrondissements: 1st = AD09FR26 … 20th = AD09FR45.
const arrondissementCode = (n: number) => `AD09FR${25 + n}`;

export const seloger = createTabProvider({
  id: "seloger",
  label: "SeLoger",
  mode: "fetch",
  searchUrls: (c) => Array.from({ length: c.maxPagesPerProvider }, (_, i) => searchUrl("https://www.seloger.com", c, i + 1)),
});

// Logic-Immo runs on the same platform as SeLoger: same search URLs, ids and pages.
export const logicimmo = createTabProvider({
  id: "logicimmo",
  label: "Logic-Immo",
  mode: "fetch",
  searchUrls: (c) => Array.from({ length: c.maxPagesPerProvider }, (_, i) => searchUrl("https://www.logic-immo.com", c, i + 1)),
});

function searchUrl(origin: string, c: SearchCriteria, page: number): string {
  const locations = c.cities.flatMap((city) =>
    city === "paris" && c.arrondissements.length ? c.arrondissements.map(arrondissementCode) : [CITY_CODES[city].seloger],
  );
  const params = new URLSearchParams({
    distributionTypes: "Buy",
    estateTypes: "Apartment",
    locations: locations.join(","),
    method: "form",
    page: String(page),
  });
  if (c.maxPrice) params.set("priceMax", String(c.maxPrice));
  if (c.minArea) params.set("spaceMin", String(c.minArea));
  if (c.minRooms) params.set("numberOfRoomsMin", String(c.minRooms));
  if (c.maxRooms) params.set("numberOfRoomsMax", String(c.maxRooms));
  if (c.maxDpe) params.set("energyCertificate", DPE_SCALE.slice(0, DPE_SCALE.indexOf(c.maxDpe) + 1).split("").join(","));
  return `${origin}/classified-search?${params}`;
}
