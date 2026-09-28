"use client";

import { useCallback, useRef, useState } from "react";
import { savePreferencesAction } from "@/app/actions";
import { toastManager } from "@/components/ui/toast";
import type { Query } from "@/lib/listings/types";

const SAVE_DELAY_MS = 700;

/** Dashboard filters, saved to the user's account shortly after each change. */
export function usePersistedQuery(initial: Query): [Query, (next: Query) => void] {
  const [query, setQuery] = useState(initial);
  const pendingSave = useRef<ReturnType<typeof setTimeout>>(undefined);

  const update = useCallback((next: Query) => {
    setQuery(next);
    clearTimeout(pendingSave.current);
    pendingSave.current = setTimeout(() => {
      savePreferencesAction(next).catch((error: Error) =>
        toastManager.add({ type: "error", title: "Filtres non enregistrés", description: error.message }),
      );
    }, SAVE_DELAY_MS);
  }, []);

  return [query, update];
}
