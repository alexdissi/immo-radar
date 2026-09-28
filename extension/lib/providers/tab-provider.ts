import type { ListingInput, ProviderId, SearchCriteria } from "~contract";
import type { AgentResult, ListingRef, SearchPage, Site } from "~lib/agent-protocol";
import { knownIds, listingId } from "~lib/db";
import { TabSession } from "./tab-session";
import type { Log, Provider } from "./types";

const DETAIL_BATCH_SIZE = 12;
const NAVIGATION_GAP_MS = 1500;
const VERIFICATION_TIMEOUT_MS = 3 * 60_000;

interface TabProviderConfig {
  id: ProviderId & Site;
  label: string;
  /**
   * "fetch": the agent requests pages itself (sites that allow it, faster).
   * "navigate": the tab loads each page like a user following links (stricter sites).
   */
  mode: "fetch" | "navigate";
  /** Result pages to browse, in order. */
  searchUrls: (criteria: SearchCriteria) => string[];
}

/**
 * Browses the site in a background tab: reads the result pages, then only opens the
 * listings that are not stored yet.
 */
export function createTabProvider({ id, label, mode, searchUrls }: TabProviderConfig): Provider {
  return {
    id,
    label,
    async *search(criteria, log, { interactive }) {
      const pages = searchUrls(criteria);
      const session = await TabSession.open(pages[0]);
      const verify = <T>(url: string, attempt: () => Promise<AgentResult<T>>) =>
        interactive ? withHumanVerification(session, url, label, log, attempt) : unwrap(label, attempt);
      try {
        const refs = new Map<string, ListingRef>();
        for (const [i, url] of pages.entries()) {
          const page: SearchPage =
            mode === "fetch"
              ? await verify(url, () => session.fetchSearch(id, url))
              : await verify(url, async () => {
                  if (i > 0) await pause(NAVIGATION_GAP_MS);
                  await session.goto(url);
                  return session.readSearch(id);
                });
          const fresh = page.refs.filter((r) => !refs.has(r.externalId));
          log(`${label} page ${i + 1} : ${fresh.length + page.listings.length} annonces`);
          if (page.listings.length) yield complete(id, page.listings);
          if (fresh.length === 0 && page.listings.length === 0) break;
          for (const ref of fresh) refs.set(ref.externalId, ref);
        }
        if (refs.size === 0) return;

        const known = await knownIds([...refs.keys()].map((externalId) => listingId(id, externalId)));
        const toOpen = [...refs.values()].filter((r) => !known.has(listingId(id, r.externalId)));
        log(`${label} : ${refs.size} trouvées, ${toOpen.length} nouvelles à ouvrir`);

        for (let i = 0; i < toOpen.length; i += DETAIL_BATCH_SIZE) {
          const batch = toOpen.slice(i, i + DETAIL_BATCH_SIZE);
          const details =
            mode === "fetch"
              ? await verify(batch[0].url, () => session.fetchDetails(id, batch))
              : await readDetailsByNavigation(session, id, batch, verify);
          yield complete(id, details);
          log(`${label} : ${Math.min(i + DETAIL_BATCH_SIZE, toOpen.length)}/${toOpen.length} fiches lues`);
        }
      } finally {
        await session.close();
      }
    },
  };
}

async function readDetailsByNavigation(
  session: TabSession,
  site: Site,
  refs: ListingRef[],
  verify: <T>(url: string, attempt: () => Promise<AgentResult<T>>) => Promise<T>,
): Promise<Partial<ListingInput>[]> {
  const listings: Partial<ListingInput>[] = [];
  for (const ref of refs) {
    await pause(NAVIGATION_GAP_MS);
    listings.push(
      await verify(ref.url, async () => {
        await session.goto(ref.url);
        return session.readDetail(site, ref);
      }),
    );
  }
  return listings;
}

/**
 * When the site asks for a human check, shows its tab so the user solves it, then retries
 * once the page has reloaded. The check itself is never bypassed.
 */
async function withHumanVerification<T>(session: TabSession, url: string, label: string, log: Log, attempt: () => Promise<AgentResult<T>>): Promise<T> {
  let result = await attempt();
  if (!result.ok && result.blocked) {
    log(`${label} demande une vérification : résous-la dans l'onglet ouvert, la recherche reprendra seule.`);
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getManifest().icons?.["128"] ?? "",
      title: `Immo Radar · ${label}`,
      message: "Vérification demandée : résous-la dans l'onglet ouvert, la recherche reprendra seule.",
    });
    const deadline = Date.now() + VERIFICATION_TIMEOUT_MS;
    await session.showForVerification(url);
    while (!result.ok && result.blocked && Date.now() < deadline) {
      await session.waitForReload(deadline - Date.now());
      result = await attempt();
    }
  }
  if (!result.ok) throw new Error(result.blocked ? `${label} : vérification non résolue, relance quand tu veux.` : result.error);
  return result.data;
}

/** Autopilot: never steals focus; a site asking for a check is simply skipped this time. */
async function unwrap<T>(label: string, attempt: () => Promise<AgentResult<T>>): Promise<T> {
  const result = await attempt();
  if (!result.ok) throw new Error(result.blocked ? `${label} demande une vérification, sauté pour ce passage` : result.error);
  return result.data;
}

/** Fills the fields a page parser could not find; listings without a price are dropped. */
function complete(source: ProviderId, details: Partial<ListingInput>[]): ListingInput[] {
  return details
    .filter((d) => d.price && d.externalId)
    .map((d) => ({ url: "", title: "", surface: 0, rooms: 0, zip: "", description: "", photos: [], ...d, source, externalId: d.externalId!, price: d.price! }));
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
