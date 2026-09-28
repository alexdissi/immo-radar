"use client";

import type { Status } from "@extension/contract";
import { Download, House, LogOut, Plug, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { saveAutopilotAction, signOutAction } from "@/app/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import {
  isOutdated,
  useAutopilotSync,
  useExtensionSettings,
  useExtensionVersion,
  useListings,
  useSearch,
  useSearchProgress,
  useUpdateStatus,
} from "@/lib/extension/queries";
import { placeLabel } from "@/lib/cities";
import { kiloEuros, SOURCE_LABELS } from "@/lib/format";
import { runQuery, toSearchCriteria } from "@/lib/listings/query";
import { usePersistedQuery } from "@/lib/preferences/use-persisted-query";
import type { Listing, Query } from "@/lib/listings/types";
import { useAddFavoriteToNotion, useNotionStatus, useRemoveFavoriteFromNotion } from "@/lib/notion/queries";
import type { NotionListing } from "@/lib/notion/types";
import { AutopilotSelect } from "./AutopilotSelect";
import { CitySelect } from "./CitySelect";
import { SimpleSelect } from "./controls";
import { SourceSelect } from "./SourceSelect";
import { FiltersPanel } from "./FiltersPanel";
import { ListingCard } from "./ListingCard";
import { NotionDialog } from "./NotionDialog";


const STATUS_OPTIONS: { value: Query["status"]; label: string }[] = [
  { value: "active", label: "Actives" },
  { value: "favorite", label: "Favoris" },
  { value: "visit", label: "À visiter" },
  { value: "rejected", label: "Écartées" },
  { value: "all", label: "Toutes" },
];

const SORT_OPTIONS: { value: Query["sortBy"]; label: string }[] = [
  { value: "price", label: "Prix croissant" },
  { value: "pricePerM2", label: "Prix au m² croissant" },
  { value: "area", label: "Surface décroissante" },
  { value: "quality", label: "Meilleur état" },
  { value: "newest", label: "Plus récentes" },
];

interface User {
  name: string;
  email: string;
  image?: string;
}

export type NotionResult = { notion: "connected" | "cancelled" | "error"; message?: string };

interface DashboardProps {
  user: User;
  notionResult?: NotionResult;
  initialQuery: Query;
  initialAutopilot: number;
}

export function Dashboard({ user, notionResult, initialQuery, initialAutopilot }: DashboardProps) {
  const [query, setQuery] = usePersistedQuery(initialQuery);
  const [autopilot, setAutopilot] = useState(initialAutopilot);
  const [notionOpen, setNotionOpen] = useState(false);

  const extension = useExtensionVersion();
  const connected = Boolean(extension.data);
  const stored = useListings(connected);
  const notion = useNotionStatus();
  const search = useSearch();
  const updateStatus = useUpdateStatus();
  const addFavorite = useAddFavoriteToNotion();
  const removeFavorite = useRemoveFavoriteFromNotion();
  const progress = useSearchProgress();
  const extensionReady = connected && !isOutdated(extension.data ?? "0");
  const extensionSettings = useExtensionSettings(extensionReady);
  useAutopilotSync(extensionReady, autopilot, toSearchCriteria(query));
  useNotionResultToast(notionResult);

  const listings = useMemo(() => runQuery(stored.data ?? [], query), [stored.data, query]);
  const total = stored.data?.length ?? 0;

  function changeAutopilot(minutes: number) {
    setAutopilot(minutes);
    saveAutopilotAction(minutes).catch((error: Error) =>
      toastManager.add({ type: "error", title: "Autopilot non enregistré", description: error.message }),
    );
  }

  function startSearch() {
    search.mutate(toSearchCriteria(query), {
      onSuccess: ({ reports }) => {
        const added = reports.reduce((sum, r) => sum + r.added, 0);
        const plural = added > 1 ? "s" : "";
        toastManager.add({ type: "success", title: `${added} nouvelle${plural} annonce${plural}` });
        for (const r of reports.filter((r) => r.error)) {
          toastManager.add({ type: "warning", title: SOURCE_LABELS[r.provider], description: r.error });
        }
      },
      onError: (error) => toastManager.add({ type: "error", title: "Recherche impossible", description: error.message }),
    });
  }

  function setStatus(listing: Listing, status: Status) {
    updateStatus.mutate(
      { id: listing.id, status },
      {
        onSuccess: () => {
          if (status === "favorite") sendToNotion(listing);
          else if (listing.status === "favorite") removeFromNotion(listing);
        },
        onError: (error) => toastManager.add({ type: "error", title: "Mise à jour impossible", description: error.message }),
      },
    );
  }

  function removeFromNotion(listing: Listing) {
    if (!notion.data?.connected) return;
    removeFavorite.mutate(listing.url, {
      onSuccess: ({ removed }) => {
        if (removed) toastManager.add({ type: "success", title: "Retiré de Notion" });
      },
      onError: (error) => toastManager.add({ type: "error", title: "Retrait Notion impossible", description: error.message }),
    });
  }

  /** Favorites go to the "Immo Radar" Notion database. */
  function sendToNotion(listing: Listing) {
    if (!notion.data?.connected) {
      toastManager.add({ type: "info", title: "Ajouté aux favoris", description: "Connecte Notion pour y envoyer tes favoris automatiquement." });
      return;
    }
    addFavorite.mutate(toNotionListing(listing), {
      onSuccess: ({ url, created }) =>
        toastManager.add({
          type: "success",
          title: created ? "Envoyé dans Notion" : "Déjà dans Notion",
          description: listing.title || "Annonce ajoutée à ta base Immo Radar.",
          actionProps: { children: "Ouvrir", onClick: () => window.open(url, "_blank", "noopener") },
        }),
      onError: (error) => toastManager.add({ type: "error", title: "Envoi Notion impossible", description: error.message }),
    });
  }


  return (
    <div className="flex min-h-dvh max-lg:flex-col">
      <FiltersPanel query={query} onChange={setQuery} />

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-background/85 px-6 py-3 backdrop-blur">
          <CitySelect value={query.cities} onChange={(cities) => setQuery({ ...query, cities })} />
          <AutopilotSelect value={autopilot} lastRun={extensionSettings.data?.lastRun} onChange={changeAutopilot} />
          <Button disabled={search.isPending || !connected || isOutdated(extension.data ?? "0")} onClick={startSearch}>
            {search.isPending ? <Spinner /> : <Search />} {search.isPending ? "Recherche…" : "Chercher les annonces"}
          </Button>
          {search.isPending && progress && <span className="max-w-72 truncate text-muted-foreground text-sm">{progress}</span>}

          <div className="ms-auto flex items-center gap-2">
            <ExtensionBadge loading={extension.isPending} version={extension.data} />
            <Button variant="outline" size="sm" onClick={() => downloadCsv(listings)}>
              <Download /> CSV
            </Button>
            <Button variant="outline" size="sm" disabled={notion.isPending} onClick={() => setNotionOpen(true)}>
              {addFavorite.isPending || removeFavorite.isPending ? <Spinner /> : <NotionIcon />} {notion.data?.connected ? "Notion" : "Connecter Notion"}
            </Button>
            <UserMenu user={user} />
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 px-6 pt-5 pb-4">
          <p className="text-sm">
            <span className="font-semibold text-base tabular-nums">{listings.length}</span>
            <span className="text-muted-foreground"> annonces sur {total}</span>
          </p>
          <div className="ms-auto flex gap-2">
            <SourceSelect value={query.sources} onChange={(sources) => setQuery({ ...query, sources })} />
            <SimpleSelect ariaLabel="Statut" className="w-36" value={query.status} options={STATUS_OPTIONS} onChange={(v) => setQuery({ ...query, status: v })} />
            <SimpleSelect ariaLabel="Tri" className="w-52" value={query.sortBy} options={SORT_OPTIONS} onChange={(v) => setQuery({ ...query, sortBy: v })} />
          </div>
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-5 px-6 pb-10">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                senderName={user.name}
                onStatus={(s) => setStatus(l, s)}
              />
            ))}
          </div>
        ) : (
          <Empty className="py-24">
            <EmptyHeader>
              <EmptyMedia variant="icon">{connected ? <House /> : <Plug />}</EmptyMedia>
              <EmptyTitle>{connected ? "Aucune annonce" : "Installe l'extension"}</EmptyTitle>
              <EmptyDescription>
                {connected
                  ? "Lance « Chercher les annonces » ou élargis les filtres."
                  : "chrome://extensions → Mode développeur → Charger l'extension non empaquetée → extension/build/chrome-mv3-prod, puis recharge la page."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </main>

      <NotionDialog open={notionOpen} status={notion.data} onOpenChange={setNotionOpen} />
    </div>
  );
}

/** Reports the Notion OAuth outcome once, then cleans the URL. */
function useNotionResultToast(result: NotionResult | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (!result) return;
    if (result.notion === "connected") toastManager.add({ type: "success", title: "Notion connecté", description: "La base « Immo Radar » est prête." });
    if (result.notion === "error") toastManager.add({ type: "error", title: "Connexion Notion impossible", description: result.message });
    router.replace("/");
  }, [result, router]);
}

function ExtensionBadge({ loading, version }: { loading: boolean; version: string | null | undefined }) {
  if (loading) return <Badge variant="outline">Extension…</Badge>;
  if (!version) {
    return (
      <Badge variant="warning">
        <Plug /> Extension non détectée
      </Badge>
    );
  }
  if (isOutdated(version)) {
    return (
      <Badge variant="warning" title="chrome://extensions → bouton ↻ sur Immo Radar, puis recharge la page">
        <Plug /> Extension à recharger (v{version})
      </Badge>
    );
  }
  return (
    <Badge variant="success">
      <Plug /> Extension v{version}
    </Badge>
  );
}

function UserMenu({ user }: { user: User }) {
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  return (
    <Menu>
      <MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Compte" className="rounded-full" />}>
        <Avatar className="size-7">
          {user.image && <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </MenuTrigger>
      <MenuPopup align="end">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-muted-foreground text-xs">{user.email}</p>
        </div>
        <MenuItem render={<a href="/onboarding" />}>
          <SlidersHorizontal /> Modifier ma recherche
        </MenuItem>
        <MenuItem onClick={() => signOutAction()}>
          <LogOut /> Se déconnecter
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

function NotionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M4.46 4.21c.75.61 1.03.56 2.44.47l13.27-.8c.28 0 .05-.28-.05-.33l-2.2-1.59c-.43-.33-1-.7-2.08-.61L3.01 2.3c-.47.04-.56.28-.38.46zm.8 3.09v13.96c0 .75.37 1.03 1.21.98l14.58-.84c.84-.05.94-.56.94-1.17V6.37c0-.61-.24-.94-.75-.89l-15.24.89c-.56.05-.75.33-.75.93zm14.39.75c.09.42 0 .84-.42.89l-.7.14v10.29c-.61.33-1.17.52-1.64.52-.75 0-.94-.24-1.5-.94l-4.59-7.21v6.97l1.45.33s0 .84-1.17.84l-3.23.19c-.09-.19 0-.65.33-.75l.84-.23V9.84l-1.17-.09c-.09-.42.14-1.03.8-1.08l3.47-.23 4.78 7.3V9.28l-1.22-.14c-.09-.51.28-.89.75-.93z" />
    </svg>
  );
}

function toNotionListing(l: Listing): NotionListing {
  const location = l.arrondissement ? `Paris ${l.arrondissement}e` : placeLabel(0, l.zip, l.city);
  const facts = [l.rooms ? `${l.rooms} pièce${l.rooms > 1 ? "s" : ""}` : "", l.livingArea ? `${l.livingArea} m²` : "", l.district ?? location];
  return {
    title: facts.filter(Boolean).join(" · "),
    url: l.url,
    source: l.source,
    location,
    district: l.district,
    price: l.price,
    totalCost: l.totalCost,
    pricePerM2: l.livingArea ? Math.round(l.price / l.livingArea) : 0,
    surface: l.livingArea,
    rooms: l.rooms || undefined,
    floor: l.floor,
    charges: l.charges,
    dpe: l.dpe,
    highlights: l.highlights,
    warnings: l.warnings,
    description: l.description,
    photos: l.photos,
  };
}

function downloadCsv(listings: Listing[]) {
  const header = ["site", "arrondissement", "prix", "cout_total", "surface_m2", "dpe", "etage", "charges", "lien"];
  const rows = listings.map((l) => [l.source, l.arrondissement, l.price, l.totalCost, l.livingArea, l.dpe ?? "", l.floor ?? "", l.charges ?? "", l.url]);
  const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "immo-radar.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}
