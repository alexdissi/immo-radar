import type { ListingInput } from "~contract";
import { firstMatch, parseFloor, parseNumber, parseRooms, squash, unique } from "./text";

/** Page parsers; they run in the agent content script, inside the site tab. */
export const parsers = {
  "seloger-search": parseSelogerSearch,
  "seloger-detail": parseSelogerDetail,
  "pap-search": parsePapSearch,
  "pap-detail": parsePapDetail,
  "leboncoin-search": parseLeboncoinSearch,
};

/** Result links on SeLoger and Logic-Immo (same platform, different URL shapes). */
function parseSelogerSearch(html: string, origin: string): { externalId: string; url: string }[] {
  const pattern = /\/?((?:annonces?\/achat|detail-annonce\/vente)\/[a-z0-9/-]+?\/([0-9A-Z]{12}))/g;
  const paths = new Map([...html.matchAll(pattern)].map((m) => [m[2], m[1]]));
  return [...paths].map(([externalId, path]) => ({ externalId, url: `${origin}/${path}` }));
}

// SeLoger (and Logic-Immo) ship page data as an escaped JSON blob; fields are read from it directly.
function parseSelogerDetail(doc: Document, html: string, url: string): Partial<ListingInput> {
  const blob = (pattern: RegExp) => {
    const raw = firstMatch(html, pattern);
    return raw ? decodeEscaped(raw) : "";
  };
  const title = doc.title;
  const pageText = squash(doc.body?.textContent ?? "");
  const coOwnership = squash(doc.querySelector('[data-testid="cdp-co-ownership"]')?.textContent ?? "");

  return {
    externalId: firstMatch(url, /\/([0-9A-Z]{12})(?:[/?#]|$)/) ?? "",
    url: url.split("?")[0],
    title: squash(title),
    price: parseNumber(firstMatch(title, /(\d[\d\s]*)\s*€/)),
    priceNet: parseNumber(firstMatch(pageText, /Prix hors honoraires\s*([\d\s ]+)\s*€/)),
    surface: parseNumber(firstMatch(title, /([\d.,]+)\s*m²/)),
    rooms: parseRooms(title),
    floor: parseFloor(pageText.slice(0, 3000)),
    dpe: firstMatch(html, /efficiencyClass\\":\{\\"index\\":\d,\\"rating\\":\\"([A-G])/),
    charges: parseNumber(firstMatch(coOwnership, /Charges de copropriété\s*([\d\s ,]+)\s*€/)),
    zip: firstMatch(html, /\\"zipCode\\":\\"(\d{5})\\"/) ?? firstMatch(title, /\((\d{5})\)/) ?? "",
    district: blob(/\\"district\\":\\"(.*?)\\"/),
    description: [
      blob(/Description\\":\{\\"headline\\":\\"(.*?)\\"/),
      blob(/Description\\":\{\\"headline\\":\\".*?\\",\\"(?:description|text)\\":\\"(.*?)\\"/),
    ].join(" — "),
    photos: unique(html.match(/https:\/\/mms\.[a-z-]+\.com\/[0-9a-f/-]+\.jpg/g) ?? []).slice(0, 8),
  };
}

function parsePapSearch(doc: Document): { urls: string[] } {
  const urls = [...doc.querySelectorAll<HTMLAnchorElement>('a[href*="/annonces/appartement-"]')]
    .map((a) => new URL(a.getAttribute("href") ?? "", "https://www.pap.fr").href.split("#")[0]);
  return { urls: unique(urls) };
}

function parsePapDetail(doc: Document, _html: string, url: string): Partial<ListingInput> {
  const title = squash(doc.title);
  const description = squash(doc.querySelector(".item-description")?.textContent ?? "");
  const pageText = squash(doc.querySelector("main")?.textContent ?? doc.body?.textContent ?? "");
  const activeDpe = [...doc.querySelectorAll(".energy-indice li.active, [class*='energy'] .active")]
    .map((el) => squash(el.textContent ?? ""))
    .find((t) => /^[A-G]$/.test(t));

  return {
    externalId: firstMatch(url, /-r(\d+)(?:$|[/?#])/) ?? "",
    url,
    title,
    price: parseNumber(firstMatch(title, /-\s*([\d.\s]+)\s*€/)),
    surface: parseNumber(firstMatch(title, /([\d.,]+)\s*m²/)),
    rooms: parseRooms(title),
    floor: parseFloor(description),
    dpe: activeDpe ?? firstMatch(description, /(?:DPE|classe [ée]nergie)\s*:?\s*([A-G])\b/i),
    charges: parseNumber(firstMatch(pageText, /[Cc]harges[^0-9]{0,40}([\d\s.]+)\s*€\s*(?:\/\s*an|par an)/)),
    zip: firstMatch(title, /\((\d{5})\)/) ?? firstMatch(`${description} ${pageText}`, /\((\d{5})\)/) ?? "",
    description,
    photos: unique(
      [...doc.querySelectorAll<HTMLImageElement>("img")]
        .map((img) => img.getAttribute("src") ?? img.getAttribute("data-src") ?? "")
        .filter((src) => /^https:\/\/cdn\.pap\.fr\/photos\//.test(src)),
    ).slice(0, 8),
  };
}

interface LeboncoinAd {
  list_id: number;
  subject: string;
  body?: string;
  url: string;
  price?: number[];
  images?: { urls_large?: string[] };
  location?: { zipcode?: string; city?: string; district?: string };
  attributes?: { key: string; value: string }[];
}

/** Leboncoin search pages carry every ad as JSON in __NEXT_DATA__. */
function parseLeboncoinSearch(doc: Document): Partial<ListingInput>[] {
  const raw = doc.getElementById("__NEXT_DATA__")?.textContent;
  if (!raw) return [];
  const ads: LeboncoinAd[] = JSON.parse(raw).props?.pageProps?.searchData?.ads ?? [];
  return ads.map((ad) => {
    const attr = (key: string) => ad.attributes?.find((a) => a.key === key)?.value;
    const buyerPaysFees = attr("fees_at_the_expanse_of") === "buyer";
    return {
      externalId: String(ad.list_id),
      url: ad.url,
      title: ad.subject,
      price: ad.price?.[0] ?? 0,
      priceNet: buyerPaysFees ? parseNumber(attr("price_except_fees")) || undefined : undefined,
      surface: parseNumber(attr("square")),
      rooms: parseNumber(attr("rooms")),
      floor: attr("floor_number") ? parseNumber(attr("floor_number")) : null,
      dpe: attr("energy_rate")?.toUpperCase(),
      zip: ad.location?.zipcode ?? "",
      city: ad.location?.city,
      district: ad.location?.district,
      description: ad.body ?? "",
      photos: (ad.images?.urls_large ?? []).slice(0, 8),
    };
  });
}

function decodeEscaped(raw: string): string {
  try {
    return JSON.parse(`"${raw.replace(/\\\\/g, "\\")}"`);
  } catch {
    return raw.replace(/\\\\[rn]/g, " ").replace(/\\+"/g, '"');
  }
}
