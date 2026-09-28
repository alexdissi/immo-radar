import { describe, expect, test } from "bun:test";
import { computeCosts, DEFAULT_FINANCING } from "./costs";
import { contactMessage } from "./contact-message";
import { DEFAULT_QUERY, enrich, runQuery, sanitizeQuery } from "./query";
import { detectWarnings, extractCarrez, WARNING_LABELS } from "./rules";
import type { StoredListing } from "@extension/contract";

const listing = (patch: Partial<StoredListing>): StoredListing => ({
  id: "bienici:1",
  source: "bienici",
  externalId: "1",
  url: "",
  title: "",
  price: 240000,
  surface: 25,
  rooms: 2,
  floor: 3,
  dpe: "D",
  zip: "75011",
  description: "",
  photos: [],
  firstSeen: new Date().toISOString(),
  status: "",
  note: "",
  ...patch,
});

describe("computeCosts", () => {
  test("uses the net price for notary fees", () => {
    const c = computeCosts(255000, 245000, DEFAULT_FINANCING);
    expect(c.notaryFees).toBeCloseTo(18497, -1);
    expect(c.totalCost).toBeCloseTo(275845, -1);
    expect(c.monthly).toBeCloseTo(1076, 0);
    expect(c.debtRatio).toBeCloseTo(34.7, 1);
  });
});

describe("rules", () => {
  test("flags trap listings", () => {
    expect(detectWarnings("2 chambres de service à réunir avec point d'eau")).toContain(WARNING_LABELS.serviceRooms);
    expect(detectWarnings("Studio vendu loué, locataire en place")).toContain(WARNING_LABELS.soldWithTenant);
    expect(detectWarnings("Appartement sans travaux à prévoir")).toEqual([]);
  });

  test("extracts the Carrez surface", () => {
    expect(extractCarrez("superficie de 21,30 m2 carrez (33,85 m2 au sol)")).toBe(21.3);
    expect(extractCarrez("Surface Carrez : 22,48 m²")).toBe(22.48);
    expect(extractCarrez("joli studio")).toBe(0);
  });

  test("prefers Carrez over the advertised surface", () => {
    expect(enrich(listing({ surface: 33.85, description: "21,30 m2 carrez" })).livingArea).toBe(21.3);
  });
});

describe("runQuery", () => {
  const paris = listing({ id: "a", zip: "75011" });
  const vincennes = listing({ id: "b", zip: "94300" });
  const outside = listing({ id: "c", zip: "93100" });

  test("filters by selected cities", () => {
    expect(runQuery([paris, vincennes, outside], DEFAULT_QUERY).map((l) => l.id)).toEqual(["a"]);
    expect(runQuery([paris, vincennes, outside], { ...DEFAULT_QUERY, cities: ["paris", "vincennes"] }).map((l) => l.id)).toEqual(["a", "b"]);
    expect(runQuery([paris, vincennes, outside], { ...DEFAULT_QUERY, cities: ["vincennes"] }).map((l) => l.id)).toEqual(["b"]);
    const laVarenne = listing({ id: "m", zip: "94210" });
    expect(runQuery([paris, laVarenne], { ...DEFAULT_QUERY, cities: ["saint-maur"] }).map((l) => l.id)).toEqual(["m"]);
  });

  test("hides rejected and ground floor listings by default", () => {
    const rejected = listing({ id: "r", status: "rejected" });
    const ground = listing({ id: "g", floor: 0 });
    expect(runQuery([rejected, ground], DEFAULT_QUERY)).toEqual([]);
  });
});

describe("contactMessage", () => {
  test("links the listing and only asks for missing details", () => {
    const message = contactMessage(enrich(listing({ url: "https://example.test/a", charges: 900, dpe: "D", floor: 3 })), "Alex");
    expect(message).toContain("https://example.test/a");
    expect(message).toContain("Paris 11e");
    expect(message).toContain("m'indiquer la taxe foncière ?");
    expect(message.endsWith("Alex")).toBe(true);
  });
});

describe("sanitizeQuery", () => {
  test("keeps valid fields and drops the rest", () => {
    const q = sanitizeQuery({ maxPrice: 300000, cities: ["vincennes", "gotham"], arrondissements: [11, 42], sortBy: "monthly", evil: true });
    expect(q.maxPrice).toBe(300000);
    expect(q.cities).toEqual(["vincennes"]);
    expect(q.arrondissements).toEqual([11]);
    expect(q.sortBy).toBe("price");
    expect("evil" in q).toBe(false);
  });
});

describe("duplicates", () => {
  const base = { zip: "94300", surface: 27, rooms: 1, dpe: "C" };

  test("folds the same property from several sites into one card", () => {
    const bienici = listing({ ...base, id: "bienici:1", source: "bienici", price: 218000, description: "RARE - bas Montreuil limite Vincennes, immeuble récent de standing" });
    const lbc = listing({ ...base, id: "leboncoin:1", source: "leboncoin", price: 217500, description: "" });
    const seloger = listing({ ...base, id: "seloger:1", source: "seloger", price: 218000, description: "RARE" });
    const other = listing({ ...base, id: "pap:1", source: "pap", price: 260000 });
    const q = { ...DEFAULT_QUERY, cities: ["vincennes" as const], maxPrice: 0 };

    const result = runQuery([bienici, lbc, seloger, other], q);
    expect(result.map((l) => l.id)).toEqual(["bienici:1", "pap:1"]);
    expect(result[0].copies.map((c) => c.source).sort()).toEqual(["leboncoin", "seloger"]);
  });

  test("keeps the triaged listing as the card", () => {
    const rich = listing({ ...base, id: "bienici:1", source: "bienici", description: "très longue description ".repeat(20) });
    const favorite = listing({ ...base, id: "leboncoin:1", source: "leboncoin", status: "favorite" });
    const [card] = runQuery([rich, favorite], { ...DEFAULT_QUERY, cities: ["vincennes"], status: "all" });
    expect(card.id).toBe("leboncoin:1");
  });
});
