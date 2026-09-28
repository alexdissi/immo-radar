import { Sparkles, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { signInWithGoogle } from "@/app/actions";
import { auth } from "@/auth";
import { AppLogoMark } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function LoginPage() {
  if ((await auth())?.user) redirect("/");
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <section className="flex flex-col bg-card px-6 py-6 sm:px-10">
        <Logo />

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="font-heading font-semibold text-3xl tracking-tight">Bon retour</h1>
          <p className="mt-2 text-muted-foreground">Retrouve tes annonces triées, tes favoris et tes visites.</p>

          <form action={signInWithGoogle} className="mt-8">
            <Button type="submit" variant="outline" size="lg" className="w-full">
              <GoogleIcon /> Continuer avec Google
            </Button>
          </form>

          <p className="mt-6 text-muted-foreground text-xs leading-relaxed">
            Ton compte sert uniquement à la connexion. Tes annonces et ton secret Notion restent dans l'extension, sur ton navigateur.
          </p>
        </div>

        <p className="text-muted-foreground text-xs">Bien'ici · SeLoger · Logic-Immo · PAP · Leboncoin</p>
      </section>

      <Showcase />
    </main>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <AppLogoMark />
      <span className="font-semibold tracking-tight">Immo Radar</span>
    </div>
  );
}

const SAMPLE_LISTINGS = [
  { place: "12e · Daumesnil", price: "250 k€", area: "28 m² · 2 pièces", total: "268 k€", charges: "720 €/an", dpe: "D", tag: "refait à neuf" },
  { place: "13e · Chevaleret", price: "255 k€", area: "31 m² · 2 pièces", total: "276 k€", charges: "960 €/an", dpe: "C", tag: "balcon / terrasse" },
  { place: "11e · Oberkampf", price: "239 k€", area: "24 m² · 1 pièce", total: "259 k€", charges: "540 €/an", dpe: "E", tag: "dernier étage" },
];

const DPE_COLORS: Record<string, string> = { C: "bg-lime-600", D: "bg-yellow-500", E: "bg-orange-500" };

function Showcase() {
  return (
    <section className="relative hidden overflow-hidden bg-[#1f3f36] text-white lg:flex lg:flex-col">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.14]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }}
      />
      <div aria-hidden className="absolute -top-40 -right-40 size-[520px] rounded-full bg-[#6fb39d]/25 blur-3xl" />

      <div className="relative px-12 pt-14">
        <h2 className="max-w-md font-heading font-semibold text-4xl leading-tight tracking-tight">Le bon appart, avant les autres.</h2>
        <p className="mt-4 max-w-sm text-white/70">
          Cinq sites en une recherche, le coût tout compris calculé, et les annonces piège écartées d'office.
        </p>
      </div>

      <div className="relative my-auto flex flex-col gap-3 px-12 py-12">
        {SAMPLE_LISTINGS.map((l, i) => (
          <div
            key={l.place}
            className={cn(
              "w-full max-w-md rounded-xl bg-white p-4 text-[#1d1d1b] shadow-2xl shadow-black/20",
              i === 1 && "ms-10",
              i === 2 && "ms-4",
            )}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-lg tabular-nums">{l.price}</span>
              <span className="text-[#6b6b66] text-sm">{l.area}</span>
              <span className={cn("ms-auto rounded px-1.5 py-0.5 font-semibold text-[11px] text-white", DPE_COLORS[l.dpe])}>{l.dpe}</span>
            </div>
            <p className="text-[#6b6b66] text-sm">{l.place}</p>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span>
                <span className="text-[#6b6b66] text-xs">Tout compris </span>
                <span className="font-medium tabular-nums">{l.total}</span>
              </span>
              <span>
                <span className="text-[#6b6b66] text-xs">Charges </span>
                <span className="font-medium tabular-nums">{l.charges}</span>
              </span>
              <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-[#2f5d50]/10 px-2 py-0.5 text-[#2f5d50] text-xs">
                <Sparkles className="size-3" /> {l.tag}
              </span>
            </div>
          </div>
        ))}

        <div className="ms-16 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/85 ring-1 ring-white/15 backdrop-blur">
          <TriangleAlert className="size-3.5 text-amber-300" />
          12 annonces piège masquées : chambres de service, viager, vendu loué…
        </div>
      </div>
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
