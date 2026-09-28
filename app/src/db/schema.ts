import type { AdapterAccountType } from "next-auth/adapters";
import { integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type { Query } from "@/lib/listings/types";

// Tables required by the Auth.js Drizzle adapter; the app stores nothing else.

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

/** One Notion workspace per user; the OAuth access token is stored encrypted (AES-256-GCM). */
export const notionConnections = pgTable("notion_connection", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  encryptedToken: text("encryptedToken").notNull(),
  workspaceName: text("workspaceName"),
  databaseId: text("databaseId").notNull(),
  databaseUrl: text("databaseUrl").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

/** Search criteria chosen during onboarding, then kept in sync with the dashboard filters. */
export const preferences = pgTable("preferences", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  query: jsonb("query").$type<Query>().notNull(),
  autopilotMinutes: integer("autopilotMinutes").notNull().default(0),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
