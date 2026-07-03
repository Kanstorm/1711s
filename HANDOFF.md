# 17:11s — Project Handoff / Context Brief

> A Destiny 2–inspired theological reading tracker for a book club.
> React (single-file component tree) + Supabase (auth + Postgres) + PWA.
> Read this first when continuing work in Claude Code or any AI session.
> Last updated: 2026-07-03.

---

## 1. What the app is

"17:11s" (named after Acts 17:11 — the Bereans who "examined the Scriptures daily")
is a gamified reading/community app for a Reformed/theology book club. The visual
language borrows heavily from Destiny 2: **Seals**, **Triumphs**, **Prestige**,
"Fireteam" (members), "Orbit" (home), a "Director" page, glowing gold/teal UI.

Core features:

- **Auth** — Supabase email/password sign-up & login, email confirmation flow.
  Profiles are created by a **database trigger** on signup (display_name passed
  via `options.data`), not by a client insert. ⚠️ No password-reset flow yet.
- **Library** — books with reading progress (slot-machine page counter), cover
  art fetched from OpenLibrary. Any member adds books; only admins edit/delete.
- **Group Reads** — invite members to read a book together, per-group chat.
  Auto-completes when every participant finishes the book and moves to a
  collapsible **Completed Group Reads** section (persists `status` to DB).
- **Reviews** — star-rated reviews with **likes** (dedicated `review_likes`
  table, direct insert/delete writes).
- **Forum** — threads + posts, 10 categories, admin pinning, Scripture
  references auto-linked to BibleGateway.
- **Triumphs/Seals** — seed seals + admin-authored custom seals; auto-tracked
  progress; equippable titles. ⚠️ The "Catechized" triumph references a
  confession quiz that does not exist in the app.
- **Prestige** — Bible-completion leveling (10 levels) with animated emblem.
- **Bible progress (Director)** — per-chapter tracking, illumination moon,
  OT/NT solar-system views.
- **Members / Fireteam** — profiles, friends, friend requests, activity feed.
- **Install page** — step-by-step add-to-home-screen guide (iPhone/Android),
  linked from the mobile menu and footer.
- **PWA** — installable, auto-updating service worker, offline-cached shell,
  gold Rajdhani wordmark icons (generated from `public/icon.svg`).

---

## 2. Source of truth & files

**GitHub `Kanstorm/1711s` (main branch) is canonical.** The OneDrive folder
`Documents/1711.V3` holds synced working copies plus a stale zip snapshot —
trust the repo, not the zip.

| File | Role |
|---|---|
| `src/1711s.jsx` (~7,200 lines) | The **entire** front end: every component, all styles (in a `STYLES` template string), routing, and the `App` root. |
| `src/supabaseData.js` | Data layer: paginated `loadAllData()`, diff-based `syncChanges()`, and `trackWrite`/`whenWritesSettled` pending-write tracking. |
| `src/supabaseClient.js` | `createClient(url, anonKey)` from `.env.local` Vite vars. |
| `vite.config.js` | React + `vite-plugin-pwa` (manifest, service worker, runtime caching for Google Fonts and OpenLibrary covers). |
| `public/` | PWA icons: `icon.svg` (source of truth), `pwa-192/512`, maskable, apple-touch, favicon. Regenerate PNGs from the SVG with sharp if the logo changes. |
| `rls_policies.sql` | **Canonical RLS policies for all 20 tables.** Idempotent — drops and recreates. Re-run after any policy change; edit this file, never hand-edit policies in the dashboard. |
| `fix_bible_progress.sql`, `fix_group_reads_update.sql` | Historical one-time fixes, superseded by/absorbed into `rls_policies.sql` (bible unique constraint stands alone — already applied). |

⚠️ `.env.local` is still committed and the repo is public. RLS is the real
security boundary (publishable keys are public by design), but removing it
from git history + rotating the key remains good hygiene.
`node_modules`/`dist` are gitignored (fresh clones: `npm install`).

**Deps:** `react`, `@supabase/supabase-js`, `lucide-react`, `vite-plugin-pwa`.

---

## 3. Architecture & data flow (read before editing)

### Single source of truth
`App` holds one big `data` object, loaded via `loadAllData()` and passed
through `AppContext`. `q()` in supabaseData paginates past Supabase's
1000-row cap (bible_progress alone is 1,189 rows per completed Bible).

### The sync wrapper
`App.setDataSynced(updater)` is what components receive as `setData`:

1. Computes new data from `dataRef.current` (NOT inside the React updater —
   side effects in updaters double-fire under StrictMode and inserted
   duplicate rows; keep it this way).
2. Calls `syncChanges(prev, next)` which diffs and fires minimal Supabase
   writes, back-filling DB-generated ids onto in-memory objects.
3. Every write is registered via `trackWrite()`; `navTo()` awaits
   `whenWritesSettled()` before its full `loadAllData()` refresh so a reload
   can never clobber a just-made change.

### Direct writes (bypass the diff sync — follow the existing pattern)
- **Bible progress** — `toggleChapter`/`markAllChapters`/prestige write
  directly with conflict-aware upserts
  (`onConflict: "user_id,book_name,chapter", ignoreDuplicates: true`;
  the unique constraint exists in the DB). `syncChanges` skips bibleProgress.
- **Review likes** — direct insert/delete on `review_likes`.
- **Books edit/delete** — direct calls in LibraryPage.
- Wrap any new direct write in `trackWrite(...)`.

### Silent-failure gotcha (bit us twice)
Supabase UPDATE/DELETE blocked by RLS returns **success with zero rows** — no
error. If a change "saves" but reverts on reload, suspect a missing policy in
`rls_policies.sql` first. The group-read completion effect also keeps a
module-level `announcedGroupReads` set so a failed write can't replay the
celebration toast every Library visit.

### Routing
`page` string + `NAV` array; `navTo(id)` re-fetches all data per navigation
(known perf trade-off). Pages: home, director, triumphs, library, reviews,
forum, members, profile, install.

---

## 4. Supabase schema (20 tables)

Same mapping as before (snake_case DB ⇄ camelCase app). Tables: profiles,
books, reading_progress, reviews, **review_likes**, threads, posts,
recommendations, activities, friendships, friend_requests, custom_seals,
custom_triumphs, completed_seals, triumph_progress, group_challenges,
group_reads (status: active/completed), group_read_members,
group_read_messages, bible_progress.

Unique constraints (required by upserts): bible_progress(user_id, book_name,
chapter), completed_seals(user_id, seal_id), reading_progress(user_id,
book_id), triumph_progress(user_id, triumph_id), friendships(user_id,
friend_id) — the last four are added by `rls_policies.sql`.

**RLS model** (enforced by `rls_policies.sql`): all SELECTs require
`authenticated` (group chat: participants only); writes scoped to own rows;
admin ops (books edit/delete, threads, seals, challenges) gated by a
SECURITY DEFINER `is_admin()` function. Anonymous users can read/write
nothing.

---

## 5. Component map (approximate; single file, use search)

Constants first (CATEGORIES, SEED_BOOKS, SEAL_DEFINITIONS ~74, DAILY_VERSES),
then helpers (ScriptureText, PrestigeEmblem, CategoryPieChart, Avatar,
BookCover, Panel, Modal…), then pages: HomePage (~1250, incl. group
challenges), TriumphsPage (~1660, incl. computeProgress auto-tracking),
LibraryPage (~2690, incl. group reads + completion effect), ReviewsPage
(~3520, incl. likes), ForumPage (~3740), MembersPage (~4230), BIBLE_BOOKS
(~4300) + DirectorPage (~4430), ProfilePage (~5180), STYLES (~5480, incl.
safe-area insets for the iPhone Dynamic Island), AuthScreen (~6700),
InstallPage, App root (~7050).

---

## 6. Current state & open items

Recently shipped: bible tracker persistence fixes, group-read completed
section, PWA + official logo, install guide page, safe-area/notch fix,
RLS policy script.

Open, roughly in priority order:
1. **Confirm `rls_policies.sql` has been run** and re-test the app as admin
   and as a normal member (silent zero-row writes were widespread before).
2. **Password reset** — members have no recovery path
   (`supabase.auth.resetPasswordForEmail` + a screen).
3. **Realtime** — an older snapshot had live forum updates via
   `supabase.channel`; that code is NOT in the repo. Group-read chat has
   never had realtime (messages appear only after navigation).
4. **Sync-failure visibility** — sync errors only hit the console; surface a
   toast on failed writes.
5. **Confession quiz** — build it or retire the "Catechized" triumph.
6. Repo hygiene — purge `.env.local` from history, rotate key.
7. Ideas parked: reading plans/streaks, meeting scheduler, notifications
   bell, group-read pacing.

---

## 7. Working conventions (keep)

- **One file** for the front end; new components go inline.
- Immutable `setData` updates; let `syncChanges` persist. Direct writes only
  for the exceptions in §3, always wrapped in `trackWrite`.
- Styling in the `STYLES` string. Palette: near-black `#0B0A08`, gold
  `#D4AF37`, teal `#2B9EB3`, parchment text. Fonts Rajdhani/Jost (loaded via
  `@import` inside STYLES). Keep the Destiny feel.
- Icons from `lucide-react`; Scripture in body copy via `ScriptureText`.
- New DB-backed feature = table + policies in `rls_policies.sql` + both
  `loadAllData` and `syncChanges` + UI.
- Commits to `main` on GitHub `Kanstorm/1711s`; deploy picks up from there.

## 8. Suggested prompt to open a session

> "This is my '17:11s' React + Supabase reading-club app, repo
> Kanstorm/1711s. Read HANDOFF.md, then skim `src/1711s.jsx` and
> `src/supabaseData.js` as needed. Today I want to: ⟨task⟩."
