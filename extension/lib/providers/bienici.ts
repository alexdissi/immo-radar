import type { ListingInput, SearchCriteria } from "~contract";
import { CITY_CODES } from "~lib/cities";
import type { Provider } from "./types";

const API = "https://www.bienici.com/realEstateAds.json";
const PAGE_SIZE = 100;


interface BieniciAd {
  id: string;
  city: string;
  postalCode: string;
  title?: string;
  description?: string;
  price: number;
  priceWithoutFees?: number;
  feesChargedTo?: string;
  surfaceArea: number;
  roomsQuantity: number;
  floor?: number | null;
  energyClassification?: string;
  annualCondominiumFees?: number;
  district?: { libelle?: string };
  photos?: { url?: string; url_photo?: string }[];
}

/** Bien'ici exposes a public JSON API, callable straight from the service worker. */
export const bienici: Provider = {
  id: "bienici",
  label: "Bien'ici",
  async *search(criteria, log, _options) {
    for (let page = 0; page < criteria.maxPagesPerProvider; page++) {
      const res = await fetch(`${API}?filters=${encodeURIComponent(JSON.stringify(buildFilters(criteria, page)))}`);
      if (!res.ok) throw new Error(`Bien'ici a répondu ${res.status}`);
      const { realEstateAds: ads, total } = (await res.json()) as { realEstateAds: BieniciAd[]; total: number };
      log(`Bien'ici page ${page + 1} : ${ads.length} annonces (${total} au total)`);
      yield ads.map(toListing);
      if (ads.length < PAGE_SIZE) return;
    }
  },
};

function buildFilters(c: SearchCriteria, page: number) {
  return {
    size: PAGE_SIZE,
    from: page * PAGE_SIZE,
    page: page + 1,
    filterType: "buy",
    propertyType: ["flat"],
    sortBy: "publicationDate",
    sortOrder: "desc",
    onTheMarket: [true],
    maxPrice: c.maxPrice || undefined,
    minArea: c.minArea || undefined,
    minRooms: c.minRooms || undefined,
    maxRooms: c.maxRooms || undefined,
    zoneIdsByTypes: { zoneIds: c.cities.map((city) => CITY_CODES[city].bienici) },
  };
}

function toListing(ad: BieniciAd): ListingInput {
  const buyerPaysFees = ad.feesChargedTo === "buyer" && (ad.priceWithoutFees ?? 0) < ad.price;
  return {
    source: "bienici",
    externalId: ad.id,
    url: listingUrl(ad),
    title: ad.title ?? "",
    price: ad.price,
    priceNet: buyerPaysFees ? ad.priceWithoutFees : undefined,
    surface: ad.surfaceArea,
    rooms: ad.roomsQuantity,
    floor: ad.floor ?? null,
    dpe: ad.energyClassification,
    charges: ad.annualCondominiumFees,
    zip: ad.postalCode,
    city: ad.city,
    district: ad.district?.libelle,
    description: (ad.description ?? "").replace(/<[^>]+>/g, " "),
    photos: (ad.photos ?? []).map((p) => p.url ?? p.url_photo ?? "").filter(Boolean).slice(0, 8),
  };
}

function listingUrl(ad: BieniciAd): string {
  const citySlug = ad.city.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
  const rooms = ad.roomsQuantity > 1 ? `${ad.roomsQuantity}pieces` : "1piece";
  return `https://www.bienici.com/annonce/vente/${citySlug}/appartement/${rooms}/${ad.id}`;
}
