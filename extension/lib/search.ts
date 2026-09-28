import type { ProviderId, ProviderReport, SearchCriteria } from "~contract";
import { upsertListings } from "./db";
import { bienici } from "./providers/bienici";
import { pap } from "./providers/pap";
import { leboncoin } from "./providers/leboncoin";
import { logicimmo, seloger } from "./providers/seloger";
import type { Log, Provider, SearchOptions } from "./providers/types";

const PROVIDERS: Record<ProviderId, Provider> = { bienici, seloger, logicimmo, pap, leboncoin };

let running: Promise<ProviderReport[]> | null = null;

/** Runs one search across providers; concurrent calls share the in-flight run. */
export function runSearch(criteria: SearchCriteria, log: Log, onBatch: () => void, options: SearchOptions): Promise<ProviderReport[]> {
  running ??= searchProviders(criteria, log, onBatch, options).finally(() => {
    running = null;
  });
  return running;
}

async function searchProviders(criteria: SearchCriteria, log: Log, onBatch: () => void, options: SearchOptions) {
  const reports: ProviderReport[] = [];
  for (const id of criteria.providers) {
    const provider = PROVIDERS[id];
    const report: ProviderReport = { provider: id, fetched: 0, added: 0 };
    if (!provider) {
      reports.push({ ...report, error: "Site inconnu de cette version de l'extension" });
      continue;
    }
    log(`${provider.label} : recherche…`);
    try {
      for await (const batch of provider.search(criteria, log, options)) {
        if (batch.length === 0) continue;
        report.fetched += batch.length;
        report.added += await upsertListings(batch);
        onBatch();
      }
      log(`${provider.label} : ${report.fetched} annonces, ${report.added} nouvelles`);
    } catch (error) {
      report.error = error instanceof Error ? error.message : String(error);
      log(`${provider.label} : ${report.error}`);
    }
    reports.push(report);
  }
  return reports;
}
