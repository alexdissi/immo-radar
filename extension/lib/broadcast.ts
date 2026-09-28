import type { ExtensionEvent } from "~contract";

/** Web app origins; keep in sync with contents/bridge.ts and the manifest host permissions. */
export const APP_URL = "http://localhost:3737";
export const APP_URL_PATTERNS = [`${APP_URL}/*`];

/** Pushes an event to the popup and to every open web app tab (through the bridge). */
export async function broadcast(event: ExtensionEvent) {
  const ignoreMissingReceiver = () => {};
  chrome.runtime.sendMessage(event).catch(ignoreMissingReceiver);
  const tabs = await chrome.tabs.query({ url: APP_URL_PATTERNS });
  for (const tab of tabs) {
    if (tab.id !== undefined) chrome.tabs.sendMessage(tab.id, event).catch(ignoreMissingReceiver);
  }
}
