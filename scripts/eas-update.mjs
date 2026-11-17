// Publish an OTA update with the same EXPO_PUBLIC_* values as the build profile.
// `eas update` ignores eas.json build `env`, so without this a laptop .env (or env.ts
// fallbacks such as http://localhost:3000) ends up in the bundle (M-10).
// Usage: node scripts/eas-update.mjs <profile> [eas update flags, e.g. --message "..."]
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [profileName, ...args] = process.argv.slice(2);
const profile = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8')).build?.[profileName];
if (!profile?.channel || !profile.env || !profile.environment) {
  console.error(`eas.json build.${profileName} needs channel, environment and env`);
  process.exit(1);
}

// --environment also sets EXPO_NO_DOTENV, so .env is never read. EAS server-side
// variables for that environment (none today) would override these values.
const result = spawnSync(
  'eas',
  ['update', '--channel', profile.channel, '--environment', profile.environment, ...args],
  { stdio: 'inherit', env: { ...process.env, ...profile.env } },
);
if (result.error)
  console.error(result.error.message);
process.exit(result.status ?? 1);
