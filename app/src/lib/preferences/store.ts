import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences } from "@/db/schema";
import { type AutopilotMinutes, isAutopilotMinutes } from "@/lib/autopilot";
import { sanitizeQuery } from "@/lib/listings/query";
import type { Query } from "@/lib/listings/types";

export interface Preferences {
  query: Query;
  autopilotMinutes: AutopilotMinutes;
}

/** Saved preferences, or null when the user has not been through onboarding yet. */
export async function getPreferences(userId: string): Promise<Preferences | null> {
  const [row] = await db.select().from(preferences).where(eq(preferences.userId, userId));
  if (!row) return null;
  return { query: sanitizeQuery(row.query), autopilotMinutes: isAutopilotMinutes(row.autopilotMinutes) ? row.autopilotMinutes : 0 };
}

export async function savePreferences(userId: string, input: { query?: unknown; autopilotMinutes?: unknown }) {
  const values: Partial<typeof preferences.$inferInsert> = { updatedAt: new Date() };
  if (input.query !== undefined) values.query = sanitizeQuery(input.query);
  if (input.autopilotMinutes !== undefined) {
    if (!isAutopilotMinutes(input.autopilotMinutes)) throw new Error("Fréquence d'autopilot inconnue");
    values.autopilotMinutes = input.autopilotMinutes;
  }
  await db
    .insert(preferences)
    .values({ userId, query: values.query ?? sanitizeQuery({}), autopilotMinutes: values.autopilotMinutes ?? 0 })
    .onConflictDoUpdate({ target: preferences.userId, set: values });
}
