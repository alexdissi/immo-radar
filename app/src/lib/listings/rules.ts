// Listing descriptions are in French, so the patterns are too.

interface Rule {
  label: string;
  pattern: RegExp;
}

export const WARNING_LABELS = {
  serviceRooms: "chambres de service",
  sharedWc: "WC sur palier / point d'eau",
  floorArea: "surface au sol, pas Carrez",
  lifeAnnuity: "viager",
  bareOwnership: "nue-propriété",
  soldWithTenant: "vendu loué",
  managedResidence: "résidence gérée",
  deferredSale: "vente à terme",
  renovationNeeded: "travaux",
  stagedPhotos: "photos retouchées / IA",
  houseboat: "péniche",
} as const;

export const HIGHLIGHT_LABELS = {
  fullyRenovated: "refait à neuf",
  renovated: "rénové",
  neverLivedIn: "jamais habité",
  excellentCondition: "très bon état",
  moveInReady: "sans travaux",
  outdoor: "balcon / terrasse",
  topFloor: "dernier étage",
} as const;

const W = WARNING_LABELS;
const H = HIGHLIGHT_LABELS;

const WARNING_RULES: Rule[] = [
  { label: W.serviceRooms, pattern: /chambres? de (service|bonne)/i },
  { label: W.sharedWc, pattern: /point d'eau|(wc|toilettes?)[^.]{0,20}palier/i },
  { label: W.floorArea, pattern: /m²?\s*au sol/i },
  { label: W.lifeAnnuity, pattern: /viager/i },
  { label: W.bareOwnership, pattern: /nue[- ]propri|usufruit/i },
  { label: W.soldWithTenant, pattern: /vendu (loué|occupé)|locataire (en place|sérieux)|bail en cours|actuellement loué|cong[ée]s? pour vente/i },
  { label: W.managedResidence, pattern: /résidence (services|étudiante|seniors|gérée|hôtelière)|bail commercial|\bLMNP\b|seniors/i },
  { label: W.deferredSale, pattern: /vente à terme/i },
  { label: W.renovationNeeded, pattern: /travaux (à|a) prévoir|à rénover|a renover|rafra[iî]ch|à moderniser|à remettre|potentiel/i },
  { label: W.stagedPhotos, pattern: /retouch[ée]+s?[^.]{0,20}\bIA\b|photos? de synth[èe]se|projections? virtuelles?|non contractuel/i },
  { label: W.houseboat, pattern: /péniche|bateau/i },
];

const HIGHLIGHT_RULES: Rule[] = [
  { label: H.fullyRenovated, pattern: /refaite? à neuf|entièrement (rénové|refait)e?s?/i },
  { label: H.renovated, pattern: /\brénovée?s?\b/i },
  { label: H.neverLivedIn, pattern: /jamais habité/i },
  { label: H.excellentCondition, pattern: /excellent état|parfait état|très bon état|état impeccable/i },
  { label: H.moveInReady, pattern: /clé en main|aucuns? travaux|sans travaux|habitable de suite/i },
  { label: H.outdoor, pattern: /balcon|terrasse/i },
  { label: H.topFloor, pattern: /dernier étage/i },
];

export const RENOVATION_HIGHLIGHTS: ReadonlySet<string> = new Set([H.fullyRenovated, H.renovated, H.neverLivedIn, H.excellentCondition, H.moveInReady]);

const GROUND_FLOOR = /rez[- ]de[- ]chauss|\bRDC\b/i;
const CARREZ_BEFORE = /(\d{1,3}(?:[.,]\d{1,2})?)\s*m[²2]?\s*(?:\(?\s*(?:loi\s*)?carrez)/i;
const CARREZ_AFTER = /carrez\D{0,20}(\d{1,3}(?:[.,]\d{1,2})?)/i;

const matchRules = (rules: Rule[], text: string) => rules.filter((r) => r.pattern.test(text)).map((r) => r.label);

export const detectWarnings = (text: string) => matchRules(WARNING_RULES, text.replaceAll("sans travaux à prévoir", ""));
export const detectHighlights = (text: string) => matchRules(HIGHLIGHT_RULES, text);
export const mentionsGroundFloor = (text: string) => GROUND_FLOOR.test(text);

export function extractCarrez(text: string): number {
  for (const pattern of [CARREZ_BEFORE, CARREZ_AFTER]) {
    const m = text.match(pattern);
    if (m) return Number.parseFloat(m[1].replace(",", "."));
  }
  return 0;
}
