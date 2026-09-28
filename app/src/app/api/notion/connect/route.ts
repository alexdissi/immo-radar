import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { authorizeUrl, STATE_COOKIE } from "@/lib/notion/client";

export async function GET(request: NextRequest) {
  if (!(await auth())?.user) return NextResponse.redirect(new URL("/login", request.url));
  if (!process.env.NOTION_CLIENT_ID || !process.env.NOTION_CLIENT_SECRET) {
    const params = new URLSearchParams({ notion: "error", message: "NOTION_CLIENT_ID et NOTION_CLIENT_SECRET manquent dans .env.local" });
    return NextResponse.redirect(new URL(`/?${params}`, request.url));
  }
  const state = crypto.randomUUID();
  (await cookies()).set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", maxAge: 600, path: "/" });
  return NextResponse.redirect(authorizeUrl(request.nextUrl.origin, state));
}
