import type { City } from "@extension/contract";

export interface CityOption {
  value: City;
  label: string;
  zips: string[];
}

export const CITY_GROUPS: { label: string; cities: CityOption[] }[] = [
  { label: "Paris", cities: [{ value: "paris", label: "Paris", zips: [] }] },
  {
    label: "Est parisien",
    cities: [
      { value: "vincennes", label: "Vincennes", zips: ["94300"] },
      { value: "saint-mande", label: "Saint-Mandé", zips: ["94160"] },
      { value: "saint-maur", label: "Saint-Maur-des-Fossés", zips: ["94100", "94210"] },
    ],
  },
  {
    label: "Ouest parisien",
    cities: [
      { value: "boulogne", label: "Boulogne-Billancourt", zips: ["92100"] },
      { value: "issy", label: "Issy-les-Moulineaux", zips: ["92130"] },
      { value: "levallois", label: "Levallois-Perret", zips: ["92300"] },
      { value: "neuilly", label: "Neuilly-sur-Seine", zips: ["92200"] },
    ],
  },
];

export const CITIES = CITY_GROUPS.flatMap((g) => g.cities);

/** City of a postal code outside Paris, if it is one we search. */
export const cityOfZip = (zip: string): City | undefined => CITIES.find((c) => c.zips.includes(zip))?.value;

/** "11e" in Paris, the city name elsewhere. */
export function placeLabel(arrondissement: number, zip: string, fallback?: string): string {
  if (arrondissement) return `${arrondissement}e`;
  return CITIES.find((c) => c.zips.includes(zip))?.label ?? fallback ?? zip;
}
