"use client";

import { CircleCheck, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { isOutdated, MIN_EXTENSION_VERSION } from "@/lib/extension/queries";

const ZIP_URL = "/downloads/immo-radar-extension.zip";
const EXTENSIONS_PAGE = "chrome://extensions";

/** Step-by-step install (or update) of the unpacked extension, with live detection. */
export function ExtensionInstallGuide({ version }: { version: string | null | undefined }) {
  if (version && !isOutdated(version)) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/8 p-4">
        <CircleCheck className="size-5 text-success-foreground" />
        <div>
          <p className="font-medium text-sm">Extension installée</p>
          <p className="text-muted-foreground text-xs">Version {version}, tout est prêt.</p>
        </div>
      </div>
    );
  }

  const updating = Boolean(version);
  const steps = updating
    ? [
        "Télécharge la nouvelle version et décompresse-la.",
        "Remplace le contenu du dossier de l'extension par celui du zip.",
        <>
          Ouvre <ChromeLink /> et clique sur ↻ sur Immo Radar.
        </>,
      ]
    : [
        "Télécharge le zip puis décompresse-le (double-clic). Range le dossier obtenu, par exemple dans Documents : ne le supprime pas.",
        <>
          Ouvre <ChromeLink /> dans un nouvel onglet.
        </>,
        "Active le « Mode développeur » en haut à droite.",
        "Clique sur « Charger l'extension non empaquetée » et choisis le dossier décompressé.",
      ];

  return (
    <div className="flex flex-col gap-5">
      <Button size="lg" className="w-fit" render={<a href={ZIP_URL} download />}>
        <Download /> {updating ? `Télécharger la version ${MIN_EXTENSION_VERSION}` : "Télécharger l'extension"}
      </Button>
      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-medium text-primary text-xs">{i + 1}</span>
            <span className="pt-0.5 text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Spinner className="size-4" />
        {updating ? `Version ${version} détectée, en attente de la mise à jour…` : "En attente de l'extension… la page la détecte toute seule."}
      </div>
      <p className="text-muted-foreground text-xs">
        L'extension n'est pas sur le Chrome Web Store : Chrome l'installe en « mode développeur », c'est normal. Elle ne lit que les sites
        d'annonces et cette application.
      </p>
    </div>
  );
}

/** chrome:// pages cannot be opened from a web page, so the address is copied instead. */
function ChromeLink() {
  async function copy() {
    try {
      await navigator.clipboard.writeText(EXTENSIONS_PAGE);
      toastManager.add({ type: "success", title: "Adresse copiée", description: "Colle-la dans la barre d'adresse d'un nouvel onglet." });
    } catch {
      toastManager.add({ type: "info", title: EXTENSIONS_PAGE, description: "Tape cette adresse dans un nouvel onglet." });
    }
  }
  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-foreground text-xs hover:bg-accent">
      {EXTENSIONS_PAGE} <Copy className="size-3" />
    </button>
  );
}

export function ExtensionInstallDialog({ open, onOpenChange, version }: { open: boolean; onOpenChange: (open: boolean) => void; version: string | null | undefined }) {
  const updating = Boolean(version) && isOutdated(version ?? "0");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{updating ? "Mettre à jour l'extension" : "Installer l'extension"}</DialogTitle>
          <DialogDescription>C'est elle qui cherche les annonces sur les 5 sites, avec ton navigateur.</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <ExtensionInstallGuide version={version} />
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
