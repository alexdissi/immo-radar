import type { ProviderId } from "@extension/contract";

export const euros = (n: number) => (n ? `${Math.round(n).toLocaleString("fr-FR")} €` : "—");
export const kiloEuros = (n: number) => (n ? `${Math.round(n / 1000)} k€` : "—");

export const PROVIDERS: ProviderId[] = ["bienici", "seloger", "logicimmo", "pap", "leboncoin"];

const SOURCE_DOMAINS: Record<ProviderId, string> = {
  bienici: "bienici.com",
  seloger: "seloger.com",
  logicimmo: "logic-immo.com",
  pap: "pap.fr",
  leboncoin: "leboncoin.fr",
};

export const sourceIcon = (source: ProviderId) => `https://www.google.com/s2/favicons?domain=${SOURCE_DOMAINS[source]}&sz=64`;

export const SOURCE_LABELS: Record<ProviderId, string> = {
  bienici: "Bien'ici",
  seloger: "SeLoger",
  logicimmo: "Logic-Immo",
  pap: "PAP",
  leboncoin: "Leboncoin",
};
