import type { ListingInput } from "~contract";
import type { AgentRequest, AgentResult, ListingRef, SearchPage, Site } from "~lib/agent-protocol";
import { releaseWorkerTab, workerTab } from "./worker-tab";

const LOAD_TIMEOUT_MS = 20_000;
const AGENT_READY_ATTEMPTS = 20;
const AGENT_RETRY_MS = 500;

/**
 * A provider site loaded in the pinned worker tab. The agent content script runs inside it,
 * so every request is an ordinary page request made by the user's own browser session.
 */
export class TabSession {
  private constructor(private readonly tabId: number) {}

  static async open(url: string): Promise<TabSession> {
    const session = new TabSession(await workerTab());
    await session.goto(url);
    return session;
  }

  /** Loads a page in the tab, like following a link. */
  async goto(url: string) {
    const current = await chrome.tabs.get(this.tabId);
    if (current.url === url) return this.waitForAgent();
    const loaded = waitForComplete(this.tabId, LOAD_TIMEOUT_MS);
    await chrome.tabs.update(this.tabId, { url });
    await loaded;
    await this.waitForAgent();
  }

  fetchSearch(site: Site, url: string) {
    return this.send<SearchPage>({ type: "agent:fetch-search", site, url });
  }

  fetchDetails(site: Site, refs: ListingRef[]) {
    return this.send<Partial<ListingInput>[]>({ type: "agent:fetch-details", site, refs });
  }

  readSearch(site: Site) {
    return this.send<SearchPage>({ type: "agent:read-search", site });
  }

  readDetail(site: Site, ref: ListingRef) {
    return this.send<Partial<ListingInput>>({ type: "agent:read-detail", site, ref });
  }

  /** Brings the tab to the front on the blocked page, so the user can answer the check. */
  async showForVerification(url: string) {
    const tab = await chrome.tabs.update(this.tabId, { active: true, url });
    if (tab?.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
  }

  /** Waits for the next full page load (e.g. after the check is solved), then for the agent. */
  async waitForReload(timeoutMs: number) {
    await waitForComplete(this.tabId, timeoutMs);
    await this.waitForAgent();
  }

  /** The worker tab is kept for the next search; it just goes back to its idle page. */
  async close() {
    await releaseWorkerTab(this.tabId);
  }

  private send<T>(request: AgentRequest): Promise<AgentResult<T>> {
    return chrome.tabs.sendMessage(this.tabId, request);
  }

  private async waitForAgent() {
    for (let attempt = 0; attempt < AGENT_READY_ATTEMPTS; attempt++) {
      try {
        if (await chrome.tabs.sendMessage(this.tabId, { type: "agent:ping" })) return;
      } catch {
        // Content script not injected yet.
      }
      await new Promise((resolve) => setTimeout(resolve, AGENT_RETRY_MS));
    }
    throw new Error("La page ne répond pas, réessaie dans un instant");
  }
}

/** Resolves on "complete", or after a timeout: ad-heavy pages may never fully settle. */
function waitForComplete(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, Math.max(timeoutMs, 0));
    function listener(id: number, info: chrome.tabs.OnUpdatedInfo) {
      if (id === tabId && info.status === "complete") done();
    }
    function done() {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}
