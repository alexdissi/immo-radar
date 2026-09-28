import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { exchangeCode, findOrCreateDatabase, STATE_COOKIE } from "@/lib/notion/client";
import { saveNotionConnection } from "@/lib/notion/connection";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/login", request.url));

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const back = (params: Record<string, string>) => NextResponse.redirect(new URL(`/?${new URLSearchParams(params)}`, origin));

  if (searchParams.get("error")) return back({ notion: "cancelled" });
  if (!code || !expectedState || searchParams.get("state") !== expectedState) return back({ notion: "error", message: "Session expirée, réessaie" });

  try {
    const { access_token: token, workspace_name: workspaceName } = await exchangeCode(code, origin);
    const database = await findOrCreateDatabase(token);
    await saveNotionConnection(session.user.id, { token, workspaceName, databaseId: database.id, databaseUrl: database.url });
    return back({ notion: "connected" });
  } catch (error) {
    return back({ notion: "error", message: (error as Error).message });
  }
}
