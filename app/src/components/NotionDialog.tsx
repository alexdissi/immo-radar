"use client";

import { CircleCheck, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { useNotionDisconnect } from "@/lib/notion/queries";
import type { NotionStatus } from "@/lib/notion/types";

interface Props {
  open: boolean;
  status: NotionStatus | undefined;
  onOpenChange: (open: boolean) => void;
}

export function NotionDialog({ open, status, onOpenChange }: Props) {
  const disconnect = useNotionDisconnect();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notion</DialogTitle>
          <DialogDescription>
            {status?.connected
              ? "Chaque annonce mise en favori ⭐ arrive dans ta base « Immo Radar », avec prix, coût tout compris, lieu, photos et suivi des visites."
              : "Autorise Immo Radar et choisis une page : la base « Immo Radar » y est créée, puis chaque favori ⭐ y est envoyé automatiquement."}
          </DialogDescription>
        </DialogHeader>

        {status?.connected ? (
          <>
            <DialogPanel>
              <Alert variant="success">
                <CircleCheck />
                <AlertDescription>
                  Connecté{status.workspaceName ? <> à <b>{status.workspaceName}</b></> : null}.{" "}
                  <a className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline" href={status.databaseUrl} target="_blank" rel="noreferrer">
                    Ouvrir la base <ExternalLink className="size-3" />
                  </a>
                </AlertDescription>
              </Alert>
            </DialogPanel>
            <DialogFooter>
              <Button variant="destructive-outline" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
                Déconnecter
              </Button>
              <DialogClose render={<Button />}>Terminé</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Annuler</DialogClose>
            <Button render={<a href="/api/notion/connect" />}>Connecter Notion</Button>
          </DialogFooter>
        )}
      </DialogPopup>
    </Dialog>
  );
}
