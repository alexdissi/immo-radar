const STORAGE_KEY = "workerTabId";
export const IDLE_PAGE = "tabs/worker.html";

/**
 * The single pinned tab where every site is browsed. It is reused across searches and
 * recreated if the user closed it.
 */
export async function workerTab(): Promise<number> {
  const { [STORAGE_KEY]: storedId } = (await chrome.storage.session.get(STORAGE_KEY)) as { [STORAGE_KEY]?: number };
  const existing = storedId === undefined ? undefined : await chrome.tabs.get(storedId).catch(() => undefined);
  if (existing?.id !== undefined) {
    if (!existing.pinned) await chrome.tabs.update(existing.id, { pinned: true });
    return existing.id;
  }
  const window = await chrome.windows.getLastFocused({ windowTypes: ["normal"] }).catch(() => undefined);
  const tab = await chrome.tabs.create({ url: chrome.runtime.getURL(IDLE_PAGE), pinned: true, active: false, windowId: window?.id });
  await chrome.storage.session.set({ [STORAGE_KEY]: tab.id });
  return tab.id!;
}

/** Puts the worker tab back on its idle page once a search is over. */
export async function releaseWorkerTab(tabId: number) {
  await chrome.tabs.update(tabId, { url: chrome.runtime.getURL(IDLE_PAGE) }).catch(() => {});
}
