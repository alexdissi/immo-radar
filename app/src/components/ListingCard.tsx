"use client";

import { CalendarCheck, ChevronDown, ExternalLink, ImageOff, MessageSquareText, Star, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Menu, MenuLinkItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { toastManager } from "@/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Status } from "@extension/contract";
import { euros, kiloEuros, SOURCE_LABELS } from "@/lib/format";
import { placeLabel } from "@/lib/cities";
import { contactMessage } from "@/lib/listings/contact-message";
import { SourceIcon } from "./SourceIcon";
import type { Listing } from "@/lib/listings/types";

interface Props {
  listing: Listing;
  senderName: string;
  onStatus: (status: Status) => void;
}

const STATUS_ACTIONS = [
  { status: "favorite", Icon: Star, title: "Favori · envoyer dans Notion", active: "text-amber-500 [&_svg]:fill-current" },
  { status: "visit", Icon: CalendarCheck, title: "À visiter", active: "text-primary" },
  { status: "rejected", Icon: X, title: "Écarter", active: "text-destructive-foreground" },
] as const;

const DPE_COLORS: Record<string, string> = {
  A: "bg-emerald-600", B: "bg-emerald-600", C: "bg-lime-600", D: "bg-yellow-500", E: "bg-orange-500", F: "bg-red-600", G: "bg-red-700",
};

export function ListingCard({ listing: l, senderName, onStatus }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = l.photos ?? [];
  const floorLabel = l.floor == null ? "" : l.floor === 0 ? "RDC" : `${l.floor}e étage`;
  const sources = [{ id: l.id, source: l.source, url: l.url }, ...l.copies];
  const roomsLabel = l.rooms ? `${l.rooms} pièce${l.rooms > 1 ? "s" : ""}` : "";

  return (
    <Card className={cn("overflow-hidden p-0 transition-shadow hover:shadow-md", l.status === "rejected" && "opacity-50", l.status === "favorite" && "ring-2 ring-amber-400/60")}>
      <div className="group relative aspect-[4/3] shrink-0 overflow-hidden bg-muted">
        {photos.length ? (
          <button type="button" className="absolute inset-0 cursor-pointer" aria-label="Photo suivante" onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)}>
            <img src={photos[photoIndex]} loading="lazy" referrerPolicy="no-referrer" alt="" className="size-full object-cover" />
          </button>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <ImageOff className="size-6" />
          </div>
        )}
        <Badge variant="secondary" className="absolute top-2.5 left-2.5 gap-1.5 bg-black/60 text-white backdrop-blur">
          <span className="flex -space-x-1">
            {sources.map((c) => (
              <SourceIcon key={c.id} source={c.source} className="size-3.5 rounded-[3px] bg-white ring-1 ring-black/40" />
            ))}
          </span>
          {sources.length > 1 ? `${sources.length} sites` : SOURCE_LABELS[l.source]}
        </Badge>
        {photos.length > 1 && <span className="absolute right-2.5 bottom-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] text-white tabular-nums">{photoIndex + 1}/{photos.length}</span>}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-xl tracking-tight tabular-nums">{kiloEuros(l.price)}</span>
          <span className="text-muted-foreground text-sm">{[l.livingArea ? `${l.livingArea} m²${l.carrez ? " Carrez" : ""}` : "", roomsLabel].filter(Boolean).join(" · ")}</span>
          {l.dpe && (
            <span title="DPE" className={cn("ms-auto rounded px-1.5 py-0.5 font-semibold text-[11px] text-white", DPE_COLORS[l.dpe] ?? "bg-neutral-500")}>
              {l.dpe}
            </span>
          )}
        </div>

        <p className="truncate text-muted-foreground text-sm">{[placeLabel(l.arrondissement, l.zip, l.city), l.district, floorLabel].filter(Boolean).join(" · ")}</p>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-2.5 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Tout compris</p>
            <p className="font-medium tabular-nums">{kiloEuros(l.totalCost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Charges / an</p>
            <p className="font-medium tabular-nums">{euros(l.charges ?? 0)}</p>
          </div>
        </div>

        {(l.highlights.length > 0 || l.warnings.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {l.highlights.slice(0, 3).map((h) => (
              <Badge key={h} variant="success">{h}</Badge>
            ))}
            {l.warnings.map((w) => (
              <Badge key={w} variant="error">{w}</Badge>
            ))}
          </div>
        )}

        {l.description && <p className="line-clamp-3 text-muted-foreground text-xs leading-relaxed">{l.description}</p>}

        <div className="mt-auto flex items-center justify-between border-t pt-3">
          {sources.length > 1 ? (
            <Menu>
              <MenuTrigger render={<Button variant="link" size="sm" className="px-0 text-primary" />}>
                Voir l'annonce <ChevronDown />
              </MenuTrigger>
              <MenuPopup align="start">
                {sources.map((c) => (
                  <MenuLinkItem key={c.id} href={c.url} target="_blank" rel="noreferrer">
                    <SourceIcon source={c.source} /> {SOURCE_LABELS[c.source]}
                    <ExternalLink className="ms-auto opacity-60" />
                  </MenuLinkItem>
                ))}
              </MenuPopup>
            </Menu>
          ) : (
            <Button variant="link" size="sm" className="px-0 text-primary" render={<a href={l.url} target="_blank" rel="noreferrer" />}>
              Voir l'annonce <ExternalLink />
            </Button>
          )}
          <div className="flex gap-0.5">
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Copier un message pour l'agence" onClick={() => copyContactMessage(l, senderName)} />}>
                <MessageSquareText />
              </TooltipTrigger>
              <TooltipPopup>Copier un message pour l'agence</TooltipPopup>
            </Tooltip>
            {STATUS_ACTIONS.map(({ status, Icon, title, active }) => (
              <Tooltip key={status}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={title}
                      aria-pressed={l.status === status}
                      className={cn(l.status === status && active)}
                      onClick={() => onStatus(l.status === status ? "" : status)}
                    />
                  }
                >
                  <Icon />
                </TooltipTrigger>
                <TooltipPopup>{title}</TooltipPopup>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

async function copyContactMessage(listing: Listing, senderName: string) {
  try {
    await navigator.clipboard.writeText(contactMessage(listing, senderName));
    toastManager.add({ type: "success", title: "Message copié", description: "Colle-le dans le formulaire de contact de l'annonce." });
  } catch {
    toastManager.add({ type: "error", title: "Copie impossible", description: "Autorise l'accès au presse-papiers puis réessaie." });
  }
}
