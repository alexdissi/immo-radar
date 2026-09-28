import "server-only";
import { DATABASE_PROPERTIES, listingPage } from "./template";
import type { NotionListing } from "./types";

const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";
const DATABASE_TITLE = "Immo Radar";

export const STATE_COOKIE = "notion_oauth_state";

// Columns of the first version of the database, dropped when the template is re-applied.
const LEGACY_PROPERTIES = ["Coût total", "Surface", "Arrondissement", "Statut", "Mensualité"];

export const notionRedirectUri = (origin: string) => `${origin}/api/notion/callback`;

export function authorizeUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID ?? "",
    response_type: "code",
    owner: "user",
    redirect_uri: notionRedirectUri(origin),
    state,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params}`;
}

export async function exchangeCode(code: string, origin: string) {
  const credentials = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: notionRedirectUri(origin) }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Notion ${res.status} : ${json.error_description ?? json.error ?? "échec OAuth"}`);
  return json as { access_token: string; workspace_name: string | null };
}

interface NotionObject {
  id: string;
  url: string;
  object: "page" | "database";
  title?: { plain_text: string }[];
  parent: { type: string };
}

/** Reuses an "Immo Radar" database the user shared, or creates one in the first shared page. */
export async function findOrCreateDatabase(token: string): Promise<{ id: string; url: string }> {
  const databases = await call<{ results: NotionObject[] }>(token, "POST", "/search", {
    query: DATABASE_TITLE,
    filter: { property: "object", value: "database" },
  });
  const existing = databases.results.find((db) => db.title?.map((t) => t.plain_text).join("") === DATABASE_TITLE);
  if (existing) return { id: existing.id, url: existing.url };

  const pages = await call<{ results: NotionObject[] }>(token, "POST", "/search", { filter: { property: "object", value: "page" } });
  const parent = pages.results.find((p) => p.parent.type === "workspace") ?? pages.results[0];
  if (!parent) throw new Error("Aucune page partagée : sélectionne au moins une page lors de la connexion à Notion");

  const db = await call<NotionObject>(token, "POST", "/databases", {
    parent: { type: "page_id", page_id: parent.id },
    icon: { type: "emoji", emoji: "🏠" },
    title: [{ text: { content: DATABASE_TITLE } }],
    description: [{ text: { content: "Favoris envoyés depuis Immo Radar. Passe en vue Tableau groupée par « Suivi » pour suivre tes visites." } }],
    properties: DATABASE_PROPERTIES,
  });
  return { id: db.id, url: db.url };
}

/** Adds a favorite to the database, or returns the existing page for the same listing. */
export async function addFavorite(token: string, databaseId: string, listing: NotionListing): Promise<{ url: string; created: boolean }> {
  await ensureTemplate(token, databaseId);
  const existing = await call<{ results: NotionObject[] }>(token, "POST", `/databases/${databaseId}/query`, {
    filter: { property: "Lien", url: { equals: listing.url } },
    page_size: 1,
  });
  if (existing.results[0]) return { url: existing.results[0].url, created: false };
  const page = await call<NotionObject>(token, "POST", "/pages", listingPage(databaseId, listing));
  return { url: page.url, created: true };
}

/** Moves the favorite's page(s) to the Notion trash. */
export async function removeFavorite(token: string, databaseId: string, url: string): Promise<number> {
  const pages = await call<{ results: NotionObject[] }>(token, "POST", `/databases/${databaseId}/query`, {
    filter: { property: "Lien", url: { equals: url } },
  });
  for (const page of pages.results) await call(token, "PATCH", `/pages/${page.id}`, { archived: true });
  return pages.results.length;
}

/** Adds missing columns (or fixes their type) so older databases match the template. */
async function ensureTemplate(token: string, databaseId: string) {
  const db = await call<{ properties: Record<string, { type: string }> }>(token, "GET", `/databases/${databaseId}`);
  const patch: Record<string, unknown> = {};
  for (const [name, definition] of Object.entries(DATABASE_PROPERTIES)) {
    const type = Object.keys(definition)[0];
    if (type !== "title" && db.properties[name]?.type !== type) patch[name] = definition;
  }
  for (const name of LEGACY_PROPERTIES) if (db.properties[name]) patch[name] = null;
  const title = Object.entries(db.properties).find(([, p]) => p.type === "title")?.[0];
  if (title && title !== "Annonce") patch[title] = { name: "Annonce" };
  if (Object.keys(patch).length) await call(token, "PATCH", `/databases/${databaseId}`, { properties: patch });
}

async function call<T = unknown>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": VERSION, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Notion ${res.status} : ${json.message ?? "erreur inconnue"}`);
  return json as T;
}
