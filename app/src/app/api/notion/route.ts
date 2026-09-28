import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteNotionConnection, getNotionStatus } from "@/lib/notion/connection";

export async function GET() {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  return NextResponse.json(await getNotionStatus(userId));
}

export async function DELETE() {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  await deleteNotionConnection(userId);
  return NextResponse.json({ connected: false });
}
