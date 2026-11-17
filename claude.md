# Rionna Mobile — Coding Agent Guidelines

The **Rionna member app**: iOS/Android client for a single horse-racing club
(Rionna Ireland). Members see a native feed of club/horse content (sourced from a
Circle.so community the backend fronts), horse profiles ("stables"), race
notifications, events, and news. The backend is the sibling `../rionna-ireland`
monorepo's oRPC API; planning docs/specs live in `../Architecture` (see its
`specs/` + `progress.md`).

> Template lineage: generated from the Obytes RN template (package now
> `rionna-mobile`). Leftover template bits (README, docs/, cli/) may not apply.

## Stack

- **Expo SDK 54**, React Native 0.81.5, **New Architecture enabled**
- **Expo Router 6** (file-based routes in `src/app/`)
- TailwindCSS via **Uniwind/NativeWind**; Zustand; React Query; TanStack Form + Zod
  (NOT react-hook-form); **MMKV** storage; Jest + RTL
- pnpm (`packageManager: pnpm@10.12.3`)

## Hard-won gotchas (do not relearn these)

1. **Native modules at import time: what is known.** Known to crash (stack
   overflow in `get NativeModules`, then `"main" has not been registered`):
   old-architecture third-party packages that read `NativeModules` at their own
   top level under New Arch (`react-native-restart`, `@react-native-cookies/cookies`;
   don't add packages like these), and two physical copies of `react-native` in
   the bundle. Also known to crash: a top-level import of an Expo native module
   the installed dev client was built without (`Cannot find native module`), so
   `require` newly added native modules inside a function in try/catch (see
   `src/features/events/lib/add-to-calendar.ts`). Known safe in shipped builds:
   `src/lib/storage.tsx` calls `createMMKV()` at module top level, `src/app/_layout.tsx`
   calls `hydrateAuth()` and `loadSelectedTheme()` at module top level, and
   `src/features/notifications/setup.ts` requires `expo-device` /
   `expo-notifications` at module top level (in try/catch). Not verified either
   way: anything else. New code should still init native state lazily (in a
   function or `useEffect`); storage goes through `src/lib/storage.tsx`.
2. **Never call Circle's `/home` endpoint** — it 401s for headless-provisioned
   members (which all Rionna members are). The native member feed goes through the
   backend's `circle.getMemberFeed` (`/spaces` aggregation, follow-filtered,
   server-side cached). Circle content generally arrives **via the backend API**,
   not by calling Circle directly from the app.
3. **The app is fully native since S12-06 (2026-09-15).** No Circle WebView and
   no DMs; feed, posts, comments, events and notifications all go through the
   backend. `react-native-webview` remains only for embedded media
   (`member-content/components/circle-media-frame.tsx`).

## Backend relationship

- All data comes from the rionna-ireland oRPC API at `EXPO_PUBLIC_API_URL`
  (`src/lib/api/client.tsx`). Single club: `EXPO_PUBLIC_CLUB_ID` /
  `EXPO_PUBLIC_CLUB_NAME` are baked into env.
- Auth is Better Auth with a bearer token (`Authorization` header, set in
  `src/lib/api/client.tsx`) via `src/lib/auth` and `src/features/auth`.
- `env.ts` validates all `EXPO_PUBLIC_*` vars with zod
  (`EXPO_PUBLIC_APP_ENV`: development | preview | production). Prebuilds run with
  `STRICT_ENV_VALIDATION=1`. Never put server secrets in the public env schema.
- Circle mock mode for local dev: `pnpm start:circle-mock` (backend must run
  `pnpm dev:with-circle-mock`; mock server lives in `../circle-mock`).

## Feature map (`src/features/`)

- `member-content/` — **native member feed** (backend `getMemberFeed`), tiptap
  rendering of Circle post bodies, screens + cache
- `home/` — home screen; `pulse/` — its data hooks (latest news, results, next run)
- `community-posting/` — compose, report, post menus
- `stables/` — horse profiles, race history; `paddock/` — paddock components
- `events/`, `notifications/`, `notification-centre/`, `news-detail/`, `auth/`, `settings/`

## Commands

```bash
pnpm start                # Expo dev server (pnpm start:circle-mock for mock Circle)
pnpm ios / pnpm android   # Run on platform (expo run:*)
pnpm test                 # Jest
pnpm lint                 # ESLint (+ lint:translations for i18n JSON)
pnpm type-check           # tsc --noemit
pnpm check-all            # lint + type-check + translations + tests
pnpm prebuild:development # Expo prebuild with strict env validation
pnpm update:production     # the ONLY way to publish a production OTA (never raw `eas update`)
```

## Conventions

- Absolute imports only (`@/...`), feature-based structure
  (`src/features/<name>/{screens,components,api,lib}`), routes in `src/app/`.
- Data fetching with React Query hooks in each feature's `api/` dir; global state
  in Zustand stores; forms with TanStack Form + Zod.
- MMKV (via `src/lib/storage.tsx`) for persisted data — not AsyncStorage.
- Don't edit `ios/`/`android/` directly — use Expo config plugins (`app.config.ts`).
- Tests colocated as `*.test.tsx?` next to the code; run `pnpm check-all` before
  calling work done.
- Commits: conventional format; no Co-Authored-By / "Generated with" trailers.
