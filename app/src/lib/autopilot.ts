/** Autopilot periods offered to the user, in minutes (0 = off). */
export const AUTOPILOT_MODES = [
  { minutes: 0, label: "Désactivé", short: "Off", hint: "Tu lances les recherches toi-même." },
  { minutes: 30, label: "Toutes les 30 min", short: "30 min", hint: "Pour être le premier sur les pépites." },
  { minutes: 60, label: "Toutes les heures", short: "1 h", hint: "Le bon équilibre." },
  { minutes: 180, label: "Toutes les 3 h", short: "3 h", hint: "Quelques passages dans la journée." },
  { minutes: 360, label: "Toutes les 6 h", short: "6 h", hint: "Matin, midi, soir." },
  { minutes: 720, label: "Deux fois par jour", short: "12 h", hint: "Un œil discret sur le marché." },
  { minutes: 1440, label: "Une fois par jour", short: "24 h", hint: "Un point quotidien." },
] as const;

export type AutopilotMinutes = (typeof AUTOPILOT_MODES)[number]["minutes"];

export const DEFAULT_AUTOPILOT: AutopilotMinutes = 60;

export const isAutopilotMinutes = (value: unknown): value is AutopilotMinutes => AUTOPILOT_MODES.some((m) => m.minutes === value);

export const autopilotMode = (minutes: number) => AUTOPILOT_MODES.find((m) => m.minutes === minutes) ?? AUTOPILOT_MODES[0];
