import type { PlasmoCSConfig } from "plasmo";
import type { ListingInput } from "~contract";
import type { AgentRequest, AgentResult, ListingRef, SearchPage, Site } from "~lib/agent-protocol";
import { parsers } from "~lib/parsers";
import { firstMatch } from "~lib/text";

/**
 * Runs inside the provider tabs opened by the extension. Either it reads the page the tab
 * was navigated to, or (on sites that allow it) it requests pages itself, same-origin,
 * spaced out and with a small concurrency, like a user browsing.
 */
export const config: PlasmoCSConfig = {
  matches: ["https://www.seloger.com/*", "https://www.logic-immo.com/*", "https://www.pap.fr/*", "https://www.leboncoin.fr/*"],
  run_at: "document_idle",
};

const MIN_GAP_MS = 350;
const CONCURRENCY = 3;
const BOT_WALL = /captcha-delivery|geo\.captcha|challenges\.cloudflare/i;

class BlockedError extends Error {}

chrome.runtime.onMessage.addListener((request: AgentRequest, _sender, sendResponse) => {
  if (request.type === "agent:ping") {
    sendResponse(true);
    return false;
  }
  handle(request).then(sendResponse);
  return true;
});

function handle(request: Exclude<AgentRequest, { type: "agent:ping" }>): Promise<AgentResult<unknown>> {
  switch (request.type) {
    case "agent:fetch-search":
      return guard(fetchSearch(request.url));
    case "agent:fetch-details":
      return guard(fetchDetails(request.refs));
    case "agent:read-search":
      return guard(Promise.resolve().then(() => readSearch(request.site)));
    case "agent:read-detail":
      return guard(Promise.resolve().then(() => readDetail(request.site, request.ref)));
  }
}

// Fetch mode (SeLoger, Logic-Immo).

async function fetchSearch(url: string): Promise<SearchPage> {
  return { refs: parsers["seloger-search"](await politeGet(url), location.origin), listings: [] };
}

async function fetchDetails(refs: ListingRef[]): Promise<Partial<ListingInput>[]> {
  const queue = [...refs];
  const listings: Partial<ListingInput>[] = [];
  const worker = async () => {
    for (let ref = queue.shift(); ref; ref = queue.shift()) {
      const html = await politeGet(ref.url);
      listings.push({ ...parsers["seloger-detail"](parseHtml(html), html, ref.url), externalId: ref.externalId });
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return listings;
}

let nextSlotAt = 0;
async function politeGet(url: string): Promise<string> {
  const slot = Math.max(Date.now(), nextSlotAt);
  nextSlotAt = slot + MIN_GAP_MS;
  if (slot > Date.now()) await new Promise((resolve) => setTimeout(resolve, slot - Date.now()));
  const res = await fetch(url, { credentials: "same-origin" });
  const body = await res.text();
  if (res.status === 403 || res.status === 429 || (body.length < 50_000 && BOT_WALL.test(body))) {
    throw new BlockedError(`${location.hostname} demande une vérification`);
  }
  if (!res.ok) throw new Error(`${url} a répondu ${res.status}`);
  return body;
}

// Navigation mode (PAP, Leboncoin): the page in the tab is the one to read.

function readSearch(site: Site): SearchPage {
  assertNotBlocked();
  if (site === "leboncoin") return { refs: [], listings: parsers["leboncoin-search"](document) };
  const { urls } = parsers["pap-search"](document);
  const refs = urls.map((url) => ({ externalId: firstMatch(url, /-r(\d+)(?:$|[/?#])/) ?? "", url })).filter((r) => r.externalId);
  return { refs, listings: [] };
}

function readDetail(site: Site, ref: ListingRef): Partial<ListingInput> {
  assertNotBlocked();
  if (site !== "pap") throw new Error(`Pas de fiche détaillée pour ${site}`);
  return { ...parsers["pap-detail"](document, document.documentElement.outerHTML, ref.url), externalId: ref.externalId };
}

function assertNotBlocked() {
  const html = document.documentElement.outerHTML;
  if (html.length < 80_000 && BOT_WALL.test(html)) throw new BlockedError(`${location.hostname} demande une vérification`);
}

async function guard<T>(work: Promise<T>): Promise<AgentResult<T>> {
  try {
    return { ok: true, data: await work };
  } catch (error) {
    return { ok: false, blocked: error instanceof BlockedError, error: (error as Error).message };
  }
}

const parseHtml = (html: string) => new DOMParser().parseFromString(html, "text/html");
