# Rionna Mobile — Coding Agent Guidelines

The **Rionna member app**: iOS/Android client for a single horse-racing club
(Rionna Ireland). Members see a native feed of club/horse content (sourced from a
Circle.so community the backend fronts), horse profiles ("stables"), race
notifications, events, and news. The backend is the sibling `../rionna-ireland`
monorepo's oRPC API; planning docs/specs live in `../Architecture` (see its
`specs/` + `progress.md`).

> Template lineage: generated from the Obytes RN template. The package identity is
> still `obytesapp` (+ obytes repo URL in package.json) — this must be renamed
> before store builds, but don't rename it casually mid-feature.

## Stack

- **Expo SDK 54**, React Native 0.81.5, **New Architecture enabled**
- **Expo Router 6** (file-based routes in `src/app/`)
- TailwindCSS via **Uniwind/NativeWind**; Zustand; React Query; TanStack Form + Zod
  (NOT react-hook-form); **MMKV** storage; Jest + RTL
- pnpm (`packageManager: pnpm@10.12.3`)

## Hard-won gotchas (do not relearn these)

1. **Never touch JSI/MMKV/TurboModules at module top-level.** Top-level native-module
   access crashes at import time under the New Architecture. Lazy-init inside
   functions/`useEffect`; storage access goes through `src/lib/storage.tsx`.
2. **RN cookie libraries don't load under SDK 54 + New Arch.** Clearing the Circle
   WebView session uses the **local Expo module** `modules/circle-cookies` (clears
   `HTTPCookieStorage.shared` on iOS), wrapped by `src/lib/circle-cookies`. Don't
   add `@react-native-cookies/cookies` or similar — they fail to load.
3. **Never call Circle's `/home` endpoint** — it 401s for headless-provisioned
   members (which all Rionna members are). The native member feed goes through the
   backend's `circle.getMemberFeed` (`/spaces` aggregation, follow-filtered,
   server-side cached). Circle content generally arrives **via the backend API**,
   not by calling Circle directly from the app.
4. **The Circle WebView is only needed for realtime DMs.** Feed, threads, events,
   and notifications are native, built on the backend's Member-API-based endpoints.
   Don't route new surfaces through the WebView.

## Backend relationship

- All data comes from the rionna-ireland oRPC API at `EXPO_PUBLIC_API_URL`
  (`src/lib/api/client.tsx`). Single club: `EXPO_PUBLIC_CLUB_ID` /
  `EXPO_PUBLIC_CLUB_NAME` are baked into env.
- Auth is Better Auth (session cookies) via `src/lib/auth`.
- `env.ts` validates all `EXPO_PUBLIC_*` vars with zod
  (`EXPO_PUBLIC_APP_ENV`: development | preview | production). Prebuilds run with
  `STRICT_ENV_VALIDATION=1`. Never put server secrets in the public env schema.
- Circle mock mode for local dev: `pnpm start:circle-mock` (backend must run
  `pnpm dev:with-circle-mock`; mock server lives in `../circle-mock`).

## Feature map (`src/features/`)

- `member-content/` — **native member feed** (backend `getMemberFeed`), tiptap
  rendering of Circle post bodies, screens + cache
- `pulse/` — home/"pulse" surface: latest news, results, next run, trainer posts,
  community feed tile
- `community/` — Circle WebView session handling (`use-community-session` — cookie
  install via minted member token; see gotchas 2–3)
- `stables/` — horse profiles, race history; `paddock/` — paddock components
- `events/`, `notifications/`, `news/`, `auth/`, `onboarding/`, `settings/`

## Commands

```bash
pnpm start                # Expo dev server (pnpm start:circle-mock for mock Circle)
pnpm ios / pnpm android   # Run on platform (expo run:*)
pnpm test                 # Jest
pnpm lint                 # ESLint (+ lint:translations for i18n JSON)
pnpm type-check           # tsc --noemit
pnpm check-all            # lint + type-check + translations + tests
pnpm prebuild:development # Expo prebuild with strict env validation
```

## Conventions

- Absolute imports only (`@/...`), feature-based structure
  (`src/features/<name>/{screens,components,api,lib}`), routes in `src/app/`.
- Data fetching with React Query hooks in each feature's `api/` dir; global state
  in Zustand stores; forms with TanStack Form + Zod.
- MMKV (via `src/lib/storage.tsx`) for persisted data — not AsyncStorage.
- Don't edit `ios/`/`android/` directly — use Expo config plugins (`app.config.ts`).
  The exception is the intentional local native module in `modules/circle-cookies`.
- Tests colocated as `*.test.tsx?` next to the code; run `pnpm check-all` before
  calling work done.
- Commits: conventional format; no Co-Authored-By / "Generated with" trailers.
