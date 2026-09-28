import type { City } from "~contract";

/** Location ids of each city on every provider. */
export const CITY_CODES: Record<City, { bienici: string; seloger: string; pap: string; leboncoin: string }> = {
  // Bien'ici: negated OpenStreetMap relation ids. SeLoger / Logic-Immo: AD08 geo ids.
  // PAP: slugs from pap.fr/json/ac-geo. Leboncoin: "City_zip" location labels.
  paris: { bienici: "-7444", seloger: "AD08FR31096", pap: "paris-75-g439", leboncoin: "Paris" },
  vincennes: { bienici: "-108346", seloger: "AD08FR36720", pap: "vincennes-94300-g43370", leboncoin: "Vincennes_94300" },
  "saint-mande": { bienici: "-108318", seloger: "AD08FR36708", pap: "saint-mande-94160-g43350", leboncoin: "Saint-Mandé_94160" },
  "saint-maur": { bienici: "-50964", seloger: "AD08FR36709", pap: "saint-maur-des-fosses-94-g43706", leboncoin: "Saint-Maur-des-Fossés_94100" },
  boulogne: { bienici: "-72020", seloger: "AD08FR36603", pap: "boulogne-billancourt-92100-g43267", leboncoin: "Boulogne-Billancourt_92100" },
  issy: { bienici: "-85527", seloger: "AD08FR36616", pap: "issy-les-moulineaux-92130-g43270", leboncoin: "Issy-les-Moulineaux_92130" },
  levallois: { bienici: "-86985", seloger: "AD08FR36617", pap: "levallois-perret-92300-g43289", leboncoin: "Levallois-Perret_92300" },
  neuilly: { bienici: "-85802", seloger: "AD08FR36623", pap: "neuilly-sur-seine-92200-g43282", leboncoin: "Neuilly-sur-Seine_92200" },
};
