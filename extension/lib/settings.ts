import type { Settings } from "~contract";

const KEY = "settings";
const DEFAULT_SETTINGS: Settings = { scheduleMinutes: 0, criteria: null, lastRun: null };

export async function loadSettings(): Promise<Settings> {
  const { [KEY]: stored } = (await chrome.storage.local.get(KEY)) as { [KEY]?: Partial<Settings> };
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}
