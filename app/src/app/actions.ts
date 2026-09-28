"use server";

import { auth, signIn, signOut } from "@/auth";
import type { Query } from "@/lib/listings/types";
import { savePreferences } from "@/lib/preferences/store";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

async function currentUserId(): Promise<string> {
  const userId = (await auth())?.user?.id;
  if (!userId) throw new Error("Non connecté");
  return userId;
}

export async function savePreferencesAction(query: Query) {
  await savePreferences(await currentUserId(), { query });
}

export async function saveAutopilotAction(autopilotMinutes: number) {
  await savePreferences(await currentUserId(), { autopilotMinutes });
}

export async function completeOnboardingAction(query: Query, autopilotMinutes: number) {
  await savePreferences(await currentUserId(), { query, autopilotMinutes });
}

