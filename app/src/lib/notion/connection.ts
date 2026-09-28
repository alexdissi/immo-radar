import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notionConnections } from "@/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import type { NotionStatus } from "./types";

export async function getNotionStatus(userId: string): Promise<NotionStatus> {
  const [connection] = await db
    .select({ workspaceName: notionConnections.workspaceName, databaseUrl: notionConnections.databaseUrl })
    .from(notionConnections)
    .where(eq(notionConnections.userId, userId));
  return connection ? { connected: true, workspaceName: connection.workspaceName ?? undefined, databaseUrl: connection.databaseUrl } : { connected: false };
}

export async function saveNotionConnection(userId: string, input: { token: string; workspaceName: string | null; databaseId: string; databaseUrl: string }) {
  const values = {
    userId,
    encryptedToken: encrypt(input.token),
    workspaceName: input.workspaceName,
    databaseId: input.databaseId,
    databaseUrl: input.databaseUrl,
  };
  await db.insert(notionConnections).values(values).onConflictDoUpdate({ target: notionConnections.userId, set: values });
}

/** Decrypted token and target database, or null when the user never connected Notion. */
export async function loadNotionCredentials(userId: string) {
  const [connection] = await db.select().from(notionConnections).where(eq(notionConnections.userId, userId));
  return connection ? { token: decrypt(connection.encryptedToken), databaseId: connection.databaseId } : null;
}

export async function deleteNotionConnection(userId: string) {
  await db.delete(notionConnections).where(eq(notionConnections.userId, userId));
}
