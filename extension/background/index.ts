import type { ExtensionApi, ExtensionMethod, ExtensionRequest, ExtensionResponse, ProviderReport } from "~contract";
import { APP_URL, broadcast } from "~lib/broadcast";
import { allListings, updateListing } from "~lib/db";
import type { SearchOptions } from "~lib/providers/types";
import { runSearch } from "~lib/search";
import { loadSettings, saveSettings } from "~lib/settings";

const SEARCH_ALARM = "scheduled-search";
const NEW_LISTINGS_NOTIFICATION = "new-listings";

type Handlers = { [M in ExtensionMethod]: (params: ExtensionApi[M]["request"]) => Promise<ExtensionApi[M]["response"]> };

const handlers: Handlers = {
  ping: async () => ({ version: chrome.runtime.getManifest().version }),
  "listings:list": () => allListings(),
  "listings:update": async ({ id, status, note }) => {
    const listing = await updateListing(id, status, note);
    broadcast({ type: "listings:changed" });
    return listing;
  },
  "search:start": async ({ criteria }) => {
    if (criteria) await saveSettings({ criteria });
    return { reports: await startSearch({ interactive: true }) };
  },
  "settings:get": () => loadSettings(),
  "settings:set": async (patch) => {
    const settings = await saveSettings(patch);
    await syncSchedule();
    return settings;
  },
};

chrome.runtime.onMessage.addListener((request: ExtensionRequest, _sender, sendResponse) => {
  if (!(request?.method in handlers)) return false;
  dispatch(request).then(sendResponse);
  return true;
});

async function dispatch<M extends ExtensionMethod>({ method, params }: ExtensionRequest<M>): Promise<ExtensionResponse<M>> {
  try {
    return { ok: true, data: await (handlers[method] as (p: typeof params) => Promise<ExtensionApi[M]["response"]>)(params) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function startSearch(options: SearchOptions): Promise<ProviderReport[]> {
  const { criteria } = await loadSettings();
  if (!criteria) throw new Error("Lance une première recherche depuis l'application");
  const reports = await runSearch(
    criteria,
    (message) => broadcast({ type: "search:progress", message }),
    () => broadcast({ type: "listings:changed" }),
    options,
  );
  broadcast({ type: "search:done", reports });
  return reports;
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== SEARCH_ALARM) return;
  const reports = await startSearch({ interactive: false });
  const added = reports.reduce((sum, r) => sum + r.added, 0);
  await saveSettings({ lastRun: { at: new Date().toISOString(), added, failed: reports.filter((r) => r.error).map((r) => r.provider) } });
  notifyNewListings(added);
});

chrome.notifications.onClicked.addListener((id) => {
  if (id === NEW_LISTINGS_NOTIFICATION) chrome.tabs.create({ url: APP_URL });
});

chrome.runtime.onInstalled.addListener(syncSchedule);
chrome.runtime.onStartup.addListener(syncSchedule);

/** (Re)creates the alarm only when the period changed, so frequent syncs do not postpone runs. */
async function syncSchedule() {
  const { scheduleMinutes } = await loadSettings();
  const alarm = await chrome.alarms.get(SEARCH_ALARM);
  if ((alarm?.periodInMinutes ?? 0) === scheduleMinutes) return;
  await chrome.alarms.clear(SEARCH_ALARM);
  if (scheduleMinutes > 0) await chrome.alarms.create(SEARCH_ALARM, { periodInMinutes: scheduleMinutes, delayInMinutes: 1 });
}

function notifyNewListings(added: number) {
  if (added === 0) return;
  const plural = added > 1 ? "s" : "";
  chrome.notifications.create(NEW_LISTINGS_NOTIFICATION, {
    type: "basic",
    iconUrl: chrome.runtime.getManifest().icons?.["128"] ?? "",
    title: "Immo Radar",
    message: `${added} nouvelle${plural} annonce${plural} pour ta recherche`,
  });
}
