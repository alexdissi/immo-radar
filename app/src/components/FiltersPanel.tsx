"use client";

import { RotateCcw } from "lucide-react";
import type React from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DEFAULT_QUERY } from "@/lib/listings/query";
import type { Query } from "@/lib/listings/types";
import { AppLogoMark } from "./AppLogo";
import { ArrondissementPicker } from "./ArrondissementPicker";
import { CheckboxRow, NumberInput, SimpleSelect } from "./controls";

const DPE_OPTIONS = [
  { value: "", label: "Tous" },
  ..."ABCDEFG".split("").map((d) => ({ value: d, label: d })),
];
const FRESHNESS_OPTIONS = [
  { value: 0, label: "Toutes" },
  { value: 1, label: "Dernières 24 h" },
  { value: 3, label: "3 derniers jours" },
  { value: 7, label: "7 derniers jours" },
];

export function FiltersPanel({
  query,
  onChange,
}: {
  query: Query;
  onChange: (next: Query) => void;
}) {
  const set = <K extends keyof Query>(key: K, value: Query[K]) =>
    onChange({ ...query, [key]: value });

  return (
    <aside className="sticky top-0 flex h-dvh w-80 shrink-0 flex-col border-r bg-sidebar max-lg:static max-lg:h-auto max-lg:w-full max-lg:border-r-0 max-lg:border-b">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <AppLogoMark className="size-9" />
          <div>
            <h1 className="font-semibold text-lg leading-tight tracking-tight">Immo Radar</h1>
            <p className="text-muted-foreground text-xs">Paris · achat</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_QUERY)}
        >
          <RotateCcw /> Réinitialiser
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6 px-5 pb-8">
          <Section title="Budget">
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Prix min"
                step={5000}
                suffix="€"
                value={query.minPrice}
                onChange={(v) => set("minPrice", v)}
              />
              <NumberInput
                label="Prix max"
                step={5000}
                suffix="€"
                value={query.maxPrice}
                onChange={(v) => set("maxPrice", v)}
              />
              <NumberInput
                label="Prix au m² max"
                step={500}
                suffix="€"
                value={query.maxPricePerM2}
                onChange={(v) => set("maxPricePerM2", v)}
              />
              <NumberInput
                label="Charges max / an"
                step={100}
                suffix="€"
                value={query.maxCharges}
                onChange={(v) => set("maxCharges", v)}
              />
            </div>
          </Section>

          <Section title="Surface & pièces">
            <NumberInput
              label="Surface min"
              suffix="m²"
              value={query.minArea}
              onChange={(v) => set("minArea", v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Pièces min"
                value={query.minRooms}
                onChange={(v) => set("minRooms", v)}
              />
              <NumberInput
                label="Pièces max"
                value={query.maxRooms}
                onChange={(v) => set("maxRooms", v)}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              La surface Carrez est utilisée quand l'annonce la mentionne.
            </p>
          </Section>

          {query.cities.includes("paris") && (
            <Section title="Arrondissements">
              <ArrondissementPicker value={query.arrondissements} onChange={(v) => set("arrondissements", v)} />
            </Section>
          )}

          <Section title="Étage & extérieur">
            <NumberInput
              label="Étage minimum"
              value={query.minFloor}
              onChange={(v) => set("minFloor", v)}
            />
            <div className="flex flex-col gap-1.5">
              <CheckboxRow
                label="Exclure les rez-de-chaussée"
                checked={query.excludeGroundFloor}
                onChange={(v) => set("excludeGroundFloor", v)}
              />
              <CheckboxRow
                label="Dernier étage uniquement"
                checked={query.topFloorOnly}
                onChange={(v) => set("topFloorOnly", v)}
              />
              <CheckboxRow
                label="Avec balcon ou terrasse"
                checked={query.outdoorOnly}
                onChange={(v) => set("outdoorOnly", v)}
              />
            </div>
          </Section>

          <Section title="État & énergie">
            <Field className="gap-1.5">
              <FieldLabel className="text-muted-foreground text-xs">
                DPE maximum
              </FieldLabel>
              <SimpleSelect
                className="w-full"
                value={query.maxDpe}
                options={DPE_OPTIONS}
                onChange={(v) => set("maxDpe", v)}
              />
            </Field>
            <div className="flex flex-col gap-1.5">
              <CheckboxRow
                label="Garder les DPE non renseignés"
                checked={query.allowUnknownDpe}
                onChange={(v) => set("allowUnknownDpe", v)}
              />
              <CheckboxRow
                label="Rénové / sans travaux uniquement"
                checked={query.renovatedOnly}
                onChange={(v) => set("renovatedOnly", v)}
              />
              <CheckboxRow
                label="Masquer les annonces piège"
                checked={query.hideWarnings}
                onChange={(v) => set("hideWarnings", v)}
              />
            </div>
          </Section>

          <Section title="Mots-clés">
            <Field className="gap-1.5">
              <FieldLabel className="text-muted-foreground text-xs">
                Contient
              </FieldLabel>
              <Input
                value={query.text}
                placeholder="parquet, lumineux…"
                onChange={(e) => set("text", e.target.value)}
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel className="text-muted-foreground text-xs">
                Exclure (séparés par des virgules)
              </FieldLabel>
              <Input
                value={query.excludeText}
                placeholder="sans ascenseur, sur cour…"
                onChange={(e) => set("excludeText", e.target.value)}
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel className="text-muted-foreground text-xs">
                Ajoutées
              </FieldLabel>
              <SimpleSelect
                className="w-full"
                value={query.newWithinDays}
                options={FRESHNESS_OPTIONS}
                onChange={(v) => set("newWithinDays", v)}
              />
            </Field>
          </Section>
        </div>
      </ScrollArea>
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
        {title}
      </h2>
      {children}
    </section>
  );
}
