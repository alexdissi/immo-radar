/** Parses French-formatted numbers: "245 000", "260.000", "21,30". */
export function parseNumber(value: string | undefined | null): number {
  if (!value) return 0;
  const normalized = value.replace(/[\s  ]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function firstMatch(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1];
}

export function parseFloor(text: string): number | null {
  if (/\b(RDC|rez[- ]de[- ]chauss)/i.test(text)) return 0;
  const m = text.match(/[ÉE]tage\s*(\d+)|(\d+)\s*(?:er|e|è|ème)\s*(?:et dernier\s*)?étage/i);
  return m ? parseInt(m[1] ?? m[2], 10) : null;
}

export function parseRooms(text: string): number {
  const m = text.match(/(\d+)\s*pi[èe]ces?|\b[TF](\d)\b/i);
  if (m) return parseInt(m[1] ?? m[2], 10);
  return /studio|studette/i.test(text) ? 1 : 0;
}

export const squash = (text: string) => text.replace(/\s+/g, " ").trim();

export const unique = <T>(values: T[]) => [...new Set(values)];
