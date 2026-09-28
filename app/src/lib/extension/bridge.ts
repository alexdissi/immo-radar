import type {
  BridgeChannel,
  BridgeMessage,
  ExtensionEvent,
  ExtensionMethod,
  ExtensionParams,
  ExtensionResult,
} from "@extension/contract";

const CHANNEL: BridgeChannel = "immo-radar";

export class ExtensionUnavailableError extends Error {
  constructor() {
    super("Extension Immo Radar non détectée");
  }
}

/** Calls the extension's service worker through the bridge content script. */
export function callExtension<M extends ExtensionMethod>(
  method: M,
  params: ExtensionParams<M>,
  timeoutMs?: number,
): Promise<ExtensionResult<M>> {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = timeoutMs ? setTimeout(() => finish(() => reject(new ExtensionUnavailableError())), timeoutMs) : undefined;
    function onMessage(event: MessageEvent<BridgeMessage>) {
      const message = event.data;
      if (event.source !== window || message?.channel !== CHANNEL || message.direction !== "to-page") return;
      if (!("id" in message) || message.id !== id) return;
      const { response } = message;
      finish(() => (response.ok ? resolve(response.data as ExtensionResult<M>) : reject(new Error(response.error))));
    }
    function finish(settle: () => void) {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      settle();
    }
    window.addEventListener("message", onMessage);
    const message: BridgeMessage = { channel: CHANNEL, direction: "to-extension", id, request: { method, params } };
    window.postMessage(message, window.location.origin);
  });
}

export function onExtensionEvent(listener: (event: ExtensionEvent) => void): () => void {
  function onMessage(event: MessageEvent<BridgeMessage>) {
    const message = event.data;
    if (event.source === window && message?.channel === CHANNEL && message.direction === "to-page" && "event" in message) {
      listener(message.event);
    }
  }
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}
