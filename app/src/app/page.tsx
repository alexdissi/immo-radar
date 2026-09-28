import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Dashboard, type NotionResult } from "@/components/Dashboard";
import { getPreferences } from "@/lib/preferences/store";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const preferences = await getPreferences(session.user.id);
  if (!preferences) redirect("/onboarding");
  const { notion, message } = await searchParams;
  const notionResult = typeof notion === "string" ? ({ notion, message: typeof message === "string" ? message : undefined } as NotionResult) : undefined;
  return (
    <Dashboard
      user={{ name: session.user.name ?? "", email: session.user.email ?? "", image: session.user.image ?? undefined }}
      notionResult={notionResult}
      initialQuery={preferences.query}
      initialAutopilot={preferences.autopilotMinutes}
    />
  );
}
