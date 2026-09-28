"use client";

import { ArrowLeft, ArrowRight, Check, Zap } from "lucide-react";
import type React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboardingAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { AUTOPILOT_MODES, autopilotMode } from "@/lib/autopilot";
import { CITIES } from "@/lib/cities";
import { kiloEuros } from "@/lib/format";
import type { Query } from "@/lib/listings/types";
import { cn } from "@/lib/utils";
import { AppLogoMark } from "./AppLogo";
import { ArrondissementPicker } from "./ArrondissementPicker";
import { CityChecklist } from "./CitySelect";
import { CheckboxRow, NumberInput } from "./controls";

const STEPS = [
  { title: "Où veux-tu acheter ?", description: "Coche les villes qui t'intéressent. Tu pourras changer ça à tout moment." },
  { title: "Ton budget", description: "Le prix affiché maximum, et la taille minimale du logement." },
  { title: "Tes critères", description: "Ce qui compte vraiment pour toi. Le reste se règle dans les filtres." },
  { title: "Mode autopilot", description: "L'extension relance la recherche toute seule et te prévient dès qu'une nouvelle annonce sort." },
];

const ALL_ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => i + 1);
const PRICE_PRESETS = [200_000, 250_000, 300_000, 400_000];
const AREA_PRESETS = [15, 20, 25, 30, 40];
const ROOM_PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Studio", min: 1, max: 1 },
  { label: "1 – 2 pièces", min: 1, max: 2 },
  { label: "2 pièces", min: 2, max: 2 },
  { label: "2 – 3 pièces", min: 2, max: 3 },
  { label: "3 pièces et +", min: 3, max: 0 },
];
const DPE_PRESETS = [
  { value: "C", label: "C ou mieux" },
  { value: "D", label: "D ou mieux" },
  { value: "E", label: "E ou mieux" },
  { value: "", label: "Peu importe" },
];

export function Onboarding({ initialQuery, initialAutopilot, firstName }: { initialQuery: Query; initialAutopilot: number; firstName: string }) {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [autopilot, setAutopilot] = useState(initialAutopilot);
  const [saving, startSaving] = useTransition();
  const router = useRouter();
  const set = <K extends keyof Query>(key: K, value: Query[K]) => setQuery((q) => ({ ...q, [key]: value }));
  const isLast = step === STEPS.length - 1;

  function next() {
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    startSaving(async () => {
      try {
        await completeOnboardingAction(query, autopilot);
        router.replace("/");
        router.refresh();
      } catch (error) {
        toastManager.add({ type: "error", title: "Enregistrement impossible", description: (error as Error).message });
      }
    });
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <section className="flex flex-col bg-card px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <AppLogoMark />
          <span className="font-semibold tracking-tight">Immo Radar</span>
        </div>

        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-10">
          <div className="mb-8 flex gap-1.5" aria-label={`Étape ${step + 1} sur ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <span key={s.title} className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>

          <p className="text-muted-foreground text-sm">
            {step === 0 ? `Bienvenue${firstName ? ` ${firstName}` : ""} · ` : ""}Étape {step + 1} sur {STEPS.length}
          </p>
          <h1 className="mt-1 font-heading font-semibold text-3xl tracking-tight">{STEPS[step].title}</h1>
          <p className="mt-2 text-muted-foreground">{STEPS[step].description}</p>

          <div className="mt-8 flex flex-col gap-6">
            {step === 0 && (
              <>
                <CityChecklist value={query.cities} onChange={(cities) => set("cities", cities)} />
                {query.cities.includes("paris") && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">Arrondissements de Paris</p>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="xs" onClick={() => set("arrondissements", ALL_ARRONDISSEMENTS)}>
                          Tous
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => set("arrondissements", [])}>
                          Aucun
                        </Button>
                      </div>
                    </div>
                    <ArrondissementPicker value={query.arrondissements} onChange={(v) => set("arrondissements", v)} />
                    <p className="text-muted-foreground text-xs">Aucun arrondissement coché = tout Paris.</p>
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <Question label="Prix maximum">
                  <Chips options={PRICE_PRESETS.map((p) => ({ key: String(p), label: kiloEuros(p) }))} selected={String(query.maxPrice)} onSelect={(v) => set("maxPrice", Number(v))} />
                  <NumberInput label="Ou un montant précis" step={5000} suffix="€" value={query.maxPrice} onChange={(v) => set("maxPrice", v)} />
                </Question>
                <Question label="Surface minimum">
                  <Chips options={AREA_PRESETS.map((a) => ({ key: String(a), label: `${a} m²` }))} selected={String(query.minArea)} onSelect={(v) => set("minArea", Number(v))} />
                </Question>
                <Question label="Nombre de pièces">
                  <Chips
                    options={ROOM_PRESETS.map((r) => ({ key: `${r.min}-${r.max}`, label: r.label }))}
                    selected={`${query.minRooms}-${query.maxRooms}`}
                    onSelect={(v) => {
                      const [minRooms, maxRooms] = v.split("-").map(Number);
                      setQuery((q) => ({ ...q, minRooms, maxRooms }));
                    }}
                  />
                </Question>
              </>
            )}

            {step === 3 && (
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Fréquence de l'autopilot">
                {AUTOPILOT_MODES.map((m) => (
                  <button
                    key={m.minutes}
                    type="button"
                    role="radio"
                    aria-checked={autopilot === m.minutes}
                    onClick={() => setAutopilot(m.minutes)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors hover:bg-accent",
                      autopilot === m.minutes && "border-primary bg-primary/5 ring-1 ring-primary",
                      m.minutes === 0 && "sm:col-span-2",
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-medium text-sm">
                      {m.minutes > 0 && <Zap className="size-3.5 text-primary" />}
                      {m.label}
                    </span>
                    <span className="text-muted-foreground text-xs">{m.hint}</span>
                  </button>
                ))}
                <p className="text-muted-foreground text-xs sm:col-span-2">
                  Chrome doit rester ouvert. Les sites qui demandent une vérification sont sautés pendant l'autopilot, sans t'interrompre.
                </p>
              </div>
            )}

            {step === 2 && (
              <>
                <Question label="Performance énergétique (DPE)">
                  <Chips options={DPE_PRESETS.map((d) => ({ key: d.value, label: d.label }))} selected={query.maxDpe} onSelect={(v) => set("maxDpe", v)} />
                </Question>
                <div className="flex flex-col gap-2 rounded-xl border p-4">
                  <CheckboxRow label="Pas de rez-de-chaussée" checked={query.excludeGroundFloor} onChange={(v) => set("excludeGroundFloor", v)} />
                  <CheckboxRow label="Rénové ou sans travaux uniquement" checked={query.renovatedOnly} onChange={(v) => set("renovatedOnly", v)} />
                  <CheckboxRow label="Avec balcon ou terrasse" checked={query.outdoorOnly} onChange={(v) => set("outdoorOnly", v)} />
                  <CheckboxRow label="Masquer les annonces piège (viager, vendu loué, chambres de service…)" checked={query.hideWarnings} onChange={(v) => set("hideWarnings", v)} />
                </div>
              </>
            )}
          </div>

          <div className="mt-10 flex items-center justify-between">
            <Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep(step - 1)}>
              <ArrowLeft /> Retour
            </Button>
            <Button size="lg" disabled={saving} onClick={next}>
              {saving ? <Spinner /> : null}
              {isLast ? "Lancer ma recherche" : "Continuer"}
              {!saving && (isLast ? <Check /> : <ArrowRight />)}
            </Button>
          </div>
        </div>
      </section>

      <Recap query={query} autopilot={autopilot} />
    </main>
  );
}

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-medium text-sm">{label}</p>
      {children}
    </div>
  );
}

function Chips({ options, selected, onSelect }: { options: { key: string; label: string }[]; selected: string; onSelect: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button
          key={o.key}
          variant="outline"
          size="sm"
          aria-pressed={o.key === selected}
          className="rounded-full aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          onClick={() => onSelect(o.key)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

/** Live summary of the search being built. */
function Recap({ query, autopilot }: { query: Query; autopilot: number }) {
  const cities = CITIES.filter((c) => query.cities.includes(c.value)).map((c) => c.label);
  const rooms = ROOM_PRESETS.find((r) => r.min === query.minRooms && r.max === query.maxRooms)?.label;
  const criteria = [
    query.maxDpe && `DPE ${query.maxDpe} ou mieux`,
    query.excludeGroundFloor && "Pas de RDC",
    query.renovatedOnly && "Rénové",
    query.outdoorOnly && "Extérieur",
    query.hideWarnings && "Sans annonce piège",
  ].filter(Boolean) as string[];
  const arrondissements =
    query.cities.includes("paris") && query.arrondissements.length > 0 && query.arrondissements.length < 20
      ? query.arrondissements.map((n) => `${n}e`).join(", ")
      : query.cities.includes("paris")
        ? "Tout Paris"
        : "";

  return (
    <section className="relative hidden overflow-hidden bg-[#1f3f36] text-white lg:flex lg:flex-col lg:justify-center">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.14]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }}
      />
      <div aria-hidden className="absolute -top-40 -right-40 size-[480px] rounded-full bg-[#6fb39d]/25 blur-3xl" />

      <div className="relative mx-auto w-full max-w-sm px-8">
        <p className="text-sm text-white/60 uppercase tracking-[0.08em]">Ta recherche</p>
        <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-white p-6 text-[#1d1d1b] shadow-2xl shadow-black/20">
          <RecapRow label="Lieu" value={cities.join(", ")} detail={arrondissements} />
          <RecapRow label="Budget" value={query.maxPrice ? `jusqu'à ${kiloEuros(query.maxPrice)}` : "Sans limite"} />
          <RecapRow label="Autopilot" value={autopilotMode(autopilot).label} />
          <RecapRow label="Logement" value={[query.minArea ? `${query.minArea} m² min.` : "", rooms].filter(Boolean).join(" · ") || "Tous"} />
          <div>
            <p className="text-[#6b6b66] text-xs">Critères</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {criteria.length ? (
                criteria.map((c) => (
                  <span key={c} className="rounded-full bg-[#2f5d50]/10 px-2.5 py-0.5 text-[#2f5d50] text-xs">
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-sm">Aucun</span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/60">Enregistré sur ton compte : tu retrouves ta recherche sur tous tes appareils.</p>
      </div>
    </section>
  );
}

function RecapRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <p className="text-[#6b6b66] text-xs">{label}</p>
      <p className="font-medium">{value}</p>
      {detail && <p className="text-[#6b6b66] text-sm">{detail}</p>}
    </div>
  );
}
