import { placeLabel } from "@/lib/cities";
import { SOURCE_LABELS } from "@/lib/format";
import type { Listing } from "./types";

/** Short first-contact message for the agency or the seller, asking only what is missing. */
export function contactMessage(l: Listing, senderName: string): string {
  const place = l.arrondissement ? `Paris ${l.arrondissement}e` : placeLabel(0, l.zip, l.city);
  const summary = [`${l.price.toLocaleString("fr-FR")} €`, l.livingArea ? `${l.livingArea} m²` : "", place].filter(Boolean).join(", ");
  const questions = [
    !l.charges && "le montant des charges de copropriété",
    "la taxe foncière",
    !l.dpe && "le DPE",
    l.floor == null && "l'étage et la présence d'un ascenseur",
  ].filter(Boolean) as string[];

  return [
    "Bonjour,",
    "",
    `Je suis intéressé par votre annonce ${SOURCE_LABELS[l.source]} (${summary}) :`,
    l.url,
    "",
    "Est-elle toujours disponible ? J'aimerais organiser une visite dès que possible.",
    `Pourriez-vous également m'indiquer ${joinFrench(questions)} ?`,
    "",
    "Merci par avance, bonne journée.",
    senderName,
  ]
    .join("\n")
    .trim();
}

function joinFrench(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} et ${items.at(-1)}` : (items[0] ?? "");
}
