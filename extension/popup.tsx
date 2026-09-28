import { useEffect, useState } from "react";
import { APP_URL } from "~lib/broadcast";
import type { ExtensionEvent, ExtensionMethod, ExtensionParams, ExtensionResponse, ExtensionResult, Settings } from "~contract";


const AUTOPILOT_LABELS: Record<number, string> = {
  0: "désactivé",
  30: "toutes les 30 min",
  60: "toutes les heures",
  180: "toutes les 3 h",
  360: "toutes les 6 h",
  720: "toutes les 12 h",
  1440: "une fois par jour",
};

async function call<M extends ExtensionMethod>(method: M, params: ExtensionParams<M>): Promise<ExtensionResult<M>> {
  const response: ExtensionResponse<M> = await chrome.runtime.sendMessage({ method, params });
  if (!response.ok) throw new Error(response.error);
  return response.data;
}

export default function Popup() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [searching, setSearching] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  // Syncs with the service worker: initial settings and live search events.
  useEffect(() => {
    call("settings:get", {}).then(setSettings);
    const onEvent = (event: ExtensionEvent) => {
      if (event.type === "search:progress") setLog((lines) => [event.message, ...lines].slice(0, 30));
    };
    chrome.runtime.onMessage.addListener(onEvent);
    return () => chrome.runtime.onMessage.removeListener(onEvent);
  }, []);

  async function search() {
    setSearching(true);
    try {
      const { reports } = await call("search:start", {});
      const added = reports.reduce((sum, r) => sum + r.added, 0);
      setLog((lines) => [`Terminé : ${added} nouvelle(s) annonce(s)`, ...lines]);
    } catch (error) {
      setLog((lines) => [(error as Error).message, ...lines]);
    } finally {
      setSearching(false);
    }
  }


  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <strong style={{ fontSize: 15 }}>Immo Radar</strong>
        <span style={styles.muted}>Connecteur</span>
      </header>

      <div style={styles.card}>
        <span style={styles.muted}>Autopilot</span>
        <strong>{settings ? (AUTOPILOT_LABELS[settings.scheduleMinutes] ?? `toutes les ${settings.scheduleMinutes} min`) : "…"}</strong>
        {settings?.lastRun && (
          <span style={styles.muted}>
            Dernier passage {new Date(settings.lastRun.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} : {settings.lastRun.added} nouvelle(s)
          </span>
        )}
        <span style={styles.muted}>Se règle dans l'application.</span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={styles.primary} disabled={searching || !settings?.criteria} onClick={search}>
          {searching ? "Recherche…" : "Chercher maintenant"}
        </button>
        <button type="button" style={styles.secondary} onClick={() => chrome.tabs.create({ url: APP_URL })}>
          Ouvrir l'app
        </button>
      </div>
      {settings && !settings.criteria && <p style={styles.muted}>Lance une première recherche depuis l'application.</p>}

      {log.length > 0 && <pre style={styles.log}>{log.join("\n")}</pre>}
    </div>
  );
}

const styles = {
  root: { width: 300, padding: 16, display: "flex", flexDirection: "column", gap: 12, fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, color: "#1d1d1b", background: "#f6f5f2" },
  header: { display: "flex", alignItems: "baseline", justifyContent: "space-between" },
  muted: { color: "#6b6b66", fontSize: 12, margin: 0 },
  card: { display: "flex", flexDirection: "column", gap: 2, padding: 10, borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,.08)" },
  primary: { flex: 1, padding: "8px 10px", borderRadius: 8, border: "none", background: "#2f5d50", color: "#fff", fontWeight: 500, cursor: "pointer" },
  secondary: { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,.12)", background: "#fff", cursor: "pointer" },
  log: { margin: 0, maxHeight: 180, overflow: "auto", padding: 8, borderRadius: 8, background: "#fff", fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap" },
} satisfies Record<string, React.CSSProperties>;
