import "server-only";
import { SOURCE_LABELS } from "@/lib/format";
import type { NotionListing } from "./types";

// Layout of the "Immo Radar" Notion database and of each favorite's page.

const DPE_COLORS: Record<string, string> = { A: "green", B: "green", C: "green", D: "yellow", E: "orange", F: "red", G: "red" };
const MAX_PHOTOS = 6;
const TEXT_LIMIT = 2000;

export const NEW_LISTING_STEP = "🆕 À contacter";

const euro = { number: { format: "euro" } };
const plain = { number: { format: "number" } };

/** Database columns; applied on creation and re-applied when a column is missing. */
export const DATABASE_PROPERTIES = {
  Annonce: { title: {} },
  Suivi: {
    select: {
      options: [
        { name: NEW_LISTING_STEP, color: "blue" },
        { name: "📞 Contacté", color: "purple" },
        { name: "📅 Visite prévue", color: "yellow" },
        { name: "✍️ Offre faite", color: "green" },
        { name: "❌ Écartée", color: "gray" },
      ],
    },
  },
  Prix: euro,
  "Tout compris": euro,
  "Prix / m²": euro,
  "Surface (m²)": plain,
  Pièces: plain,
  Étage: plain,
  Lieu: { select: {} },
  Quartier: { rich_text: {} },
  DPE: { select: { options: Object.entries(DPE_COLORS).map(([name, color]) => ({ name, color })) } },
  "Charges / an": euro,
  "Points forts": { multi_select: {} },
  Alertes: { multi_select: {} },
  Site: {
    select: {
      options: [
        { name: "Bien'ici", color: "orange" },
        { name: "SeLoger", color: "red" },
        { name: "Logic-Immo", color: "pink" },
        { name: "PAP", color: "blue" },
        { name: "Leboncoin", color: "yellow" },
      ],
    },
  },
  Lien: { url: {} },
  Visite: { date: {} },
  Notes: { rich_text: {} },
  "Ajoutée le": { created_time: {} },
};

export function listingPage(databaseId: string, l: NotionListing) {
  const text = (content: string) => [{ text: { content: content.slice(0, TEXT_LIMIT) } }];
  const tags = (names: string[]) => ({ multi_select: names.map((name) => ({ name: name.replaceAll(",", " ") })) });
  const number = (value: number | null | undefined) => ({ number: value || value === 0 ? value : null });

  return {
    parent: { database_id: databaseId },
    icon: { type: "emoji", emoji: "🏠" },
    cover: l.photos[0] ? { type: "external", external: { url: l.photos[0] } } : undefined,
    properties: {
      Annonce: { title: text(l.title) },
      Suivi: { select: { name: NEW_LISTING_STEP } },
      Prix: number(l.price),
      "Tout compris": number(l.totalCost),
      "Prix / m²": number(l.pricePerM2),
      "Surface (m²)": number(l.surface),
      Pièces: number(l.rooms),
      Étage: number(l.floor),
      Lieu: { select: { name: l.location } },
      Quartier: { rich_text: text(l.district ?? "") },
      DPE: { select: l.dpe ? { name: l.dpe.toUpperCase() } : null },
      "Charges / an": number(l.charges),
      "Points forts": tags(l.highlights),
      Alertes: tags(l.warnings),
      Site: { select: { name: SOURCE_LABELS[l.source] } },
      Lien: { url: l.url },
    },
    children: pageBody(l),
  };
}

function pageBody(l: NotionListing) {
  const paragraph = (content: string) => ({ object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content } }] } });
  const heading = (content: string) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content } }] } });
  const blocks: object[] = [
    {
      object: "block",
      type: "callout",
      callout: {
        icon: { type: "emoji", emoji: l.warnings.length ? "⚠️" : "💶" },
        color: l.warnings.length ? "red_background" : "green_background",
        rich_text: [
          {
            text: {
              content: `Tout compris ${formatEuros(l.totalCost)} (frais de notaire et garantie inclus)${l.warnings.length ? ` · À vérifier : ${l.warnings.join(", ")}` : ""}`,
            },
          },
        ],
      },
    },
    { object: "block", type: "bookmark", bookmark: { url: l.url } },
  ];
  if (l.description.trim()) {
    blocks.push(heading("Description"));
    for (const chunk of chunks(l.description.trim(), TEXT_LIMIT)) blocks.push(paragraph(chunk));
  }
  if (l.photos.length) {
    blocks.push(heading("Photos"));
    for (const url of l.photos.slice(0, MAX_PHOTOS)) blocks.push({ object: "block", type: "image", image: { type: "external", external: { url } } });
  }
  return blocks;
}

const formatEuros = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

function chunks(text: string, size: number): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
}
