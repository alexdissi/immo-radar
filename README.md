# Immo Radar

Recherche d'appartements à Paris sur Bien'ici, SeLoger et PAP, avec export Notion.

- `app/` : Next.js 16, coss ui, TanStack Query. Auth Google (Auth.js) + Drizzle sur Postgres Supabase : comptes et connexion Notion (OAuth, token chiffré AES-256-GCM).
- `extension/` : extension Chrome Plasmo, le connecteur. Elle fait tous les appels (Bien'ici en API ; SeLoger, Logic-Immo, PAP et Leboncoin via un onglet en arrière-plan avec ta session), et stocke les annonces (IndexedDB). `extension/contract.ts` définit le contrat app ↔ extension.

## Démarrer

```bash
bun run install:all

# App
cd app
cp .env.example .env.local   # AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, URLs Supabase
bun run db:push               # crée les tables d'auth dans Supabase
bun run dev                   # http://localhost:3737

# Extension
cd extension && bun run build
# chrome://extensions → Mode développeur → Charger l'extension non empaquetée → extension/build/chrome-mv3-prod
```

OAuth Google : client « Application Web », URI de redirection `http://localhost:3737/api/auth/callback/google`.

Notion : intégration **publique** sur notion.so/profile/integrations, URI de redirection `http://localhost:3737/api/notion/callback`, puis `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` dans `app/.env.local`.
