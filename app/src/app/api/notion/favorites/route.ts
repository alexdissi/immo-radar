import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addFavorite, removeFavorite } from "@/lib/notion/client";
import { loadNotionCredentials } from "@/lib/notion/connection";
import type { NotionListing } from "@/lib/notion/types";

export async function POST(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const credentials = await loadNotionCredentials(userId);
  if (!credentials) return NextResponse.json({ error: "Notion n'est pas connecté" }, { status: 409 });

  const listing = (await request.json()) as NotionListing;
  if (!listing?.url || !listing.title) return NextResponse.json({ error: "Annonce invalide" }, { status: 400 });

  try {
    return NextResponse.json(await addFavorite(credentials.token, credentials.databaseId, listing));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const credentials = await loadNotionCredentials(userId);
  if (!credentials) return NextResponse.json({ removed: 0 });

  const { url } = (await request.json()) as { url?: string };
  if (!url) return NextResponse.json({ error: "Annonce invalide" }, { status: 400 });

  try {
    return NextResponse.json({ removed: await removeFavorite(credentials.token, credentials.databaseId, url) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
