import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Onboarding } from "@/components/Onboarding";
import { DEFAULT_AUTOPILOT } from "@/lib/autopilot";
import { DEFAULT_QUERY } from "@/lib/listings/query";
import { getPreferences } from "@/lib/preferences/store";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const saved = await getPreferences(session.user.id);
  return (
    <Onboarding
      initialQuery={saved?.query ?? { ...DEFAULT_QUERY, minRooms: 1 }}
      initialAutopilot={saved?.autopilotMinutes ?? DEFAULT_AUTOPILOT}
      firstName={session.user.name?.split(" ")[0] ?? ""}
    />
  );
}
