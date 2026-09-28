import type { PlasmoCSConfig } from "plasmo";
import type { BridgeChannel, BridgeMessage, ExtensionEvent, ExtensionResponse } from "~contract";

/**
 * Relays requests from the web app page to the service worker, and events back.
 * `matches` is rewritten to the production origin by scripts/release.ts.
 */
export const config: PlasmoCSConfig = {
  matches: ["http://localhost:3737/*"],
  run_at: "document_start",
};

const CHANNEL: BridgeChannel = "immo-radar";

const post = (message: BridgeMessage) => window.postMessage(message, window.location.origin);

window.addEventListener("message", async (event: MessageEvent<BridgeMessage>) => {
  const message = event.data;
  if (event.source !== window || message?.channel !== CHANNEL || message.direction !== "to-extension") return;
  let response: ExtensionResponse;
  try {
    response = await chrome.runtime.sendMessage(message.request);
  } catch (error) {
    response = { ok: false, error: (error as Error).message };
  }
  post({ channel: CHANNEL, direction: "to-page", id: message.id, response });
});

chrome.runtime.onMessage.addListener((event: ExtensionEvent) => {
  post({ channel: CHANNEL, direction: "to-page", event });
});
