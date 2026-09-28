/**
 * Builds the extension for a given web app origin and publishes the zip in the app's
 * public folder, where users download it (the extension is not on the Chrome Web Store).
 *
 *   PLASMO_PUBLIC_APP_URL=https://immo-radar.vercel.app bun run release
 */
import { $ } from "bun";

const DEV_ORIGIN = "http://localhost:3737";
const BUILD_DIR = "build/chrome-mv3-prod";
const DOWNLOADS_DIR = "../app/public/downloads";

const appUrl = (process.env.PLASMO_PUBLIC_APP_URL ?? DEV_ORIGIN).replace(/\/$/, "");
if (!/^https?:\/\/[^/]+$/.test(appUrl)) throw new Error(`PLASMO_PUBLIC_APP_URL must be an origin, got "${appUrl}"`);

await $`bunx plasmo build`.env({ ...process.env, PLASMO_PUBLIC_APP_URL: appUrl });

const manifestPath = `${BUILD_DIR}/manifest.json`;
const manifest = await Bun.file(manifestPath).json();
const appMatch = `${appUrl}/*`;
const devMatch = `${DEV_ORIGIN}/*`;
const replaceDevOrigin = (patterns: string[]) => patterns.map((p) => (p === devMatch ? appMatch : p));
manifest.host_permissions = replaceDevOrigin(manifest.host_permissions);
for (const script of manifest.content_scripts) script.matches = replaceDevOrigin(script.matches);
await Bun.write(manifestPath, JSON.stringify(manifest));

await $`mkdir -p ${DOWNLOADS_DIR} && rm -f ${DOWNLOADS_DIR}/immo-radar-extension.zip`;
await $`cd ${BUILD_DIR} && zip -qr ../../${DOWNLOADS_DIR}/immo-radar-extension.zip .`;
await Bun.write(`${DOWNLOADS_DIR}/extension.json`, JSON.stringify({ version: manifest.version, appUrl }, null, 2));

// Leave build/ usable for local development (the unpacked extension loaded from it).
if (appUrl !== DEV_ORIGIN) await $`bunx plasmo build`.env({ ...process.env, PLASMO_PUBLIC_APP_URL: DEV_ORIGIN }).quiet();

console.log(`Extension ${manifest.version} for ${appUrl} → ${DOWNLOADS_DIR}/immo-radar-extension.zip`);
