# Restore Britain Platform — Goals & Checklist

### Overarching Goals, Milestones & Task Tracker

> **Purpose:** This is the operational backbone of the project. Every piece of work ties back to a goal, lives within a phase, and is tracked as a checkable task. Milestones within each phase define measurable "done" states so we always know where we are.
>
> **Structure:**
> - **Goal** — A major target with a deadline and success criteria. The answer to "what are we trying to achieve?"
> - **Phase** — A logical grouping of related work within a goal (e.g., 1.1, 1.2, 1.3). Each phase builds on the last.
> - **Milestone** — A measurable sub-goal that defines when a phase is complete. Binary — it's either done or it isn't.
> - **Task** — An individual piece of work. Checkable. Ordered by dependency where relevant.
>
> **Conventions:**
> - `[ ]` = Not started
> - `[~]` = In progress
> - `[x]` = Complete — **every completed task must be updated with its completion date and time** in the format `✅ Completed: DD MMM YYYY, HH:MM` appended to the task line. This creates an accurate timeline of progress and helps estimate future work.
> - Tasks marked with `⚠️` are blockers — nothing after them can proceed until they're resolved.
>
> **Example of a completed task:**
> - [x] Create Supabase project and record project URL and keys securely — ✅ Completed: 21 Feb 2026, 06:45

---

## MISSION

**Rupert Lowe elected as Prime Minister under Restore Britain at the next General Election.**

Everything we build serves this. Every goal, every phase, every task is measured against whether it moves this mission forward.

---

## GOAL 1: Live MVP with 10 Verified Members

**Deadline:** 4 March 2026
**Success criteria:** The app is live at a public URL, deployed as a PWA that feels native on mobile. 10 real Restore Britain members have registered via invite codes, each is assigned to a region, and at least one regional Telegram group is active and linked from the platform.

**What this is NOT:** This MVP does not include forums, quests, gamification, dashboards, leader tools, departments, watermarking, push notifications, or Telegram bot integration. Those are Goal 2.

---

### Phase 1.1 — Version Control & Supabase Setup

**What this phase covers:** Initialising version control (Git) as the absolute first action, then creating the Supabase project, defining the core database tables needed for the MVP (not all tables from the database architecture doc — only what's required for auth, profiles, regions, and invite codes), configuring Row Level Security, and ensuring the dashboard is clean with no errors or warnings.

**Estimated time:** 1 day

#### Milestone: A Git repository is initialised with all project docs committed, a proper `.gitignore` is in place, and the repo is pushed to a remote (GitHub/GitLab). Supabase project is live with all MVP tables created, RLS enabled on every table, no advisory issues or errors on the Supabase dashboard, and a successful test query confirms RLS is blocking unauthorised access.

**Tasks:**

*Brand asset outreach (do this on day one — parallel to everything else):*
- [x] ⚠️ Send a message to the Restore Britain team requesting brand assets: logo files (SVG preferred, highest resolution PNG acceptable), exact hex codes for their colour palette, font names or files, and any existing brand guidelines document. This is an external dependency with unpredictable response time — the earlier the request goes out, the less likely it blocks Phase 1.8. Record the date sent and who was contacted. — ✅ Completed: 20 Feb 2026, 17:30 — Email sent to info@restorebritain.org.uk by Dennis Stevens. Follow-up plan: chase via press@restorebritain.org.uk and DM to @RestoreBritain_ on X if no response within 48 hours.

*Git setup (do this first — before anything else):*
- [x] ⚠️ Initialise a Git repository in the project root: `git init` — ✅ Completed: 20 Feb 2026, 17:50
- [x] Create `.gitignore` that excludes: `.env.local`, `.env`, `node_modules/`, `.DS_Store`, any file containing secrets or API keys — ✅ Completed: 20 Feb 2026, 17:50
- [x] Stage and commit all existing project docs (CLAUDE.md, all .md files, /brand folder): `git commit -m "Initial commit: project documentation and brand skeleton"` — ✅ Completed: 20 Feb 2026, 17:52
- [x] Create a remote repository (GitHub — private repo) and push: `git remote add origin https://github.com/DennisHStevens/restore-britain-app.git` → `git push -u origin main` — ✅ Completed: 20 Feb 2026, 17:55
- [x] Verify: clone the repo to a different location and confirm all docs are present and `.env.local` is not included — ✅ Completed: 20 Feb 2026, 17:56
- [x] Log the hosting choice (GitHub vs GitLab) in `decisions-log.md` — ✅ Completed: 20 Feb 2026, 17:58 — Logged as DEC-012

*Supabase setup:*
- [x] Create Supabase project and record project URL and keys securely — ✅ Completed: 20 Feb 2026, 18:10 — Project "Restore Britain" on eu-west-2 (London)
- [x] ⚠️ Configure environment variables locally — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` stored in `.env.local`, never committed to version control — ✅ Completed: 20 Feb 2026, 18:12
- [x] Verify `.env.local` is being ignored by Git: run `git status` and confirm it does not appear — ✅ Completed: 20 Feb 2026, 18:12
- [x] Create `profiles` table with MVP-required columns only: `id`, `display_name`, `email`, `x_handle`, `region_id`, `postcode_area`, `is_verified`, `invite_code_used`, `created_at`, `updated_at` — ✅ Completed: 20 Feb 2026, 18:18
- [x] Create `regions` table: `id`, `name`, `slug`, `description`, `telegram_group_url`, `member_count`, `is_active`, `created_at` — ✅ Completed: 20 Feb 2026, 18:18
- [x] Populate `regions` table with the ~12 initial regions (North East, North West, Yorkshire & the Humber, East Midlands, West Midlands, East of England, London, South East, South West, Wales, Scotland, Northern Ireland) — ✅ Completed: 20 Feb 2026, 18:18 — All 12 regions verified present
- [x] Create `invite_codes` table: `id`, `code`, `generated_by`, `max_uses`, `times_used`, `expires_at`, `created_at` — ✅ Completed: 20 Feb 2026, 18:18
- [x] Create auto-profile trigger: function that creates a `profiles` row when a new `auth.users` row is inserted — ✅ Completed: 20 Feb 2026, 18:18
- [x] Enable RLS on every table — confirm the Supabase dashboard shows RLS enabled with no warnings — ✅ Completed: 20 Feb 2026, 18:18
- [x] Write RLS policies for `profiles`: users can read own profile (full), other users' profiles (display_name, x_handle, region_id only), update own profile only — ✅ Completed: 20 Feb 2026, 18:25 — Fixed infinite recursion bug by creating is_current_user_verified() SECURITY DEFINER helper function
- [x] Write RLS policies for `regions`: all authenticated and verified users can read, only service role can insert/update — ✅ Completed: 20 Feb 2026, 18:25
- [x] Write RLS policies for `invite_codes`: only service role can read/write (all invite code operations go through Edge Functions) — ✅ Completed: 20 Feb 2026, 18:18 — No policies = deny all for non-service-role. Confirmed by Security Advisor (info-level note, intentional by design)
- [x] Test RLS: using the Supabase SQL editor, confirm that an anon-key query returns zero rows from `profiles` and `invite_codes` — ✅ Completed: 20 Feb 2026, 18:28 — All three tables (profiles, invite_codes, regions) return 0 rows as anon role
- [x] Verify Supabase dashboard shows zero advisory issues, zero errors — ✅ Completed: 20 Feb 2026, 18:34 — Security Advisor: 0 errors, 0 warnings, 1 info (intentional: invite_codes has RLS with no policies by design). Fixed 3 search_path warnings by adding SET search_path = public to all functions.
- [x] Commit all Supabase-related work (any migration files, seed scripts, or config): `git commit -m "Phase 1.1: Supabase setup with tables and RLS"` — ✅ Completed: 21 Feb 2026, 19:54
- [x] Push to remote — ✅ Completed: 21 Feb 2026, 19:54

---

### Phase 1.2 — Authentication & Membership Gating

**What this phase covers:** Initialising the Vite + React + TypeScript frontend (pulled forward from Phase 1.3 — see DEC-013), then building email/password registration gated behind invite codes via an atomic Edge Function (see DEC-014). A user without a valid invite code cannot create an account. Users who register are automatically marked as verified. The login/logout flow works reliably. Session persistence uses Supabase's built-in localStorage token management.

**Estimated time:** 1-2 days

#### Milestone: A new user can register with a valid invite code and email/password, is automatically assigned a profile and marked as verified. Registration with an invalid or used-up invite code is rejected. Login and logout work correctly. Session persistence works (closing and reopening the app maintains login state).

**Tasks:**

*Project initialisation (pulled forward from Phase 1.3 — see DEC-013):*
- [x] ⚠️ Initialise Vite + React + TypeScript project with all dependencies (`@supabase/supabase-js`, `react-router-dom`) — ✅ Completed: 20 Feb 2026, 19:00
- [x] Create Supabase client utility (`src/lib/supabase.ts`) using `VITE_` prefixed env vars — ✅ Completed: 20 Feb 2026, 19:05
- [x] Create global CSS with CSS custom properties for theming (`src/global.css`) — ✅ Completed: 20 Feb 2026, 19:05

*Auth UI and routing:*
- [x] Build registration page UI: invite code, email, password (min 12 chars), display name, optional X handle — ✅ Completed: 20 Feb 2026, 19:15
- [x] Build login page UI: email and password fields, sign-in button, link to register — ✅ Completed: 20 Feb 2026, 19:15
- [x] Build placeholder dashboard page (post-login landing with profile info and logout) — ✅ Completed: 20 Feb 2026, 19:15
- [x] Create `useAuth` hook: tracks Supabase session, loads profile, re-renders on auth state changes — ✅ Completed: 20 Feb 2026, 19:10
- [x] Build protected route wrapper: redirects to /login if no session or unverified profile — ✅ Completed: 20 Feb 2026, 19:10
- [x] Set up React Router with routes: /login, /register, / (protected dashboard), catch-all redirect — ✅ Completed: 20 Feb 2026, 19:15
- [x] Verify TypeScript compiles with zero errors (`npx tsc --noEmit`) — ✅ Completed: 20 Feb 2026, 19:20

*Supabase Auth configuration:*
- [x] ⚠️ Configure Supabase Auth: disable email confirmation for MVP (bypassed server-side via Admin API `email_confirm: true` in Edge Function) — ✅ Completed: 20 Feb 2026, 19:25

*Atomic registration Edge Function (DEC-014):*
- [x] Create `register` Edge Function: single atomic function that validates invite code, creates user via Admin API, updates profile, and increments code usage — ✅ Completed: 20 Feb 2026, 19:30
- [x] Deploy `register` Edge Function to Supabase via dashboard editor — ✅ Completed: 20 Feb 2026, 19:40
- [x] Wire registration page to call Edge Function via `supabase.functions.invoke('register', ...)` then auto-sign-in on success — ✅ Completed: 20 Feb 2026, 19:15

*Seed data:*
- [x] Generate 20 invite codes via SQL: 2 admin (100 uses), 3 team (25 uses), 15 standard (5 uses each) — ✅ Completed: 20 Feb 2026, 19:42
- [x] Save seed SQL to `supabase/seeds/001_invite_codes.sql` — ✅ Completed: 20 Feb 2026, 19:45

*Testing:*
- [x] Test: register with valid invite code → 200, success, user created with correct profile data — ✅ Completed: 20 Feb 2026, 19:48
- [x] Test: register with invalid invite code → 400, generic error (no info leakage) — ✅ Completed: 20 Feb 2026, 19:49
- [x] Test: register with duplicate email → 400, "email may already be in use" — ✅ Completed: 20 Feb 2026, 19:50
- [x] Test: register with short password (< 12 chars) → 400, "Password must be at least 12 characters" — ✅ Completed: 20 Feb 2026, 19:51
- [x] Test: login with registered credentials → session created, redirected to dashboard — ✅ Completed: 20 Feb 2026, 21:15
- [x] Test: logout → session cleared, redirected to login — ✅ Completed: 20 Feb 2026, 21:14
- [x] Test: session persistence → close and reopen app, still logged in — ✅ Completed: 20 Feb 2026, 21:16

*Commit:*
- [x] Commit and push: `git commit -m "Phase 1.2: Auth, invite code gating, and registration flow"` — ✅ Completed: 20 Feb 2026, 21:25

---

### Phase 1.3 — PWA Shell & Mobile Experience

**What this phase covers:** Setting up the app as a proper Progressive Web App that feels native on mobile — fullscreen mode, home screen installation, basic service worker for offline shell, and the core navigation/layout structure.

**Estimated time:** 1 day

#### Milestone: The app can be added to a phone's home screen via "Add to Home Screen", launches in fullscreen (no browser chrome), displays a branded splash screen, and the core layout (header, navigation, content area) is in place and feels smooth on mobile with no janky scrolling or layout shifts.

**Tasks:**

- [x] ⚠️ Initialise the frontend project: Vite + React + TypeScript (DEC-013) — pulled forward to Phase 1.2 — ✅ Completed: 20 Feb 2026, 19:00
- [x] Create `manifest.json` with: app name ("Restore Britain"), short name, start URL, display mode `standalone`, background colour, theme colour, icons in required sizes (192x192, 512x512) — ✅ Completed: 20 Feb 2026, 22:00
- [x] Create placeholder app icons (192x192, 512x512 PNG, favicon) — using "RB" placeholder until brand assets arrive — ✅ Completed: 20 Feb 2026, 22:00
- [x] Update `index.html` with PWA meta tags: theme-color, apple-mobile-web-app-capable, apple-touch-icon, viewport-fit=cover — ✅ Completed: 20 Feb 2026, 22:05
- [x] Register a service worker: precache app shell (index, icons), cache-first for static assets, network-first for navigation, network-only for Supabase API — hand-written SW (no Workbox dependency) — ✅ Completed: 20 Feb 2026, 22:10
- [x] Build the core layout component (AppShell): fixed header with logo/app name, bottom navigation bar (Map, Profile tabs), scrollable content area — ✅ Completed: 20 Feb 2026, 22:15
- [x] Ensure the bottom navigation bar does not overlap with iOS safe area (respect `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)`) — ✅ Completed: 20 Feb 2026, 22:15
- [x] Implement smooth page transitions between tabs (React Router, no hard reloads, no flicker) — ✅ Completed: 20 Feb 2026, 22:20
- [x] Create MapView placeholder page and Profile page with edit functionality (display_name, x_handle) — ✅ Completed: 20 Feb 2026, 22:20
- [x] Add `refreshProfile()` to useAuth hook for post-edit data refresh — ✅ Completed: 20 Feb 2026, 22:20
- [x] Verify: zero console errors on fresh load, manifest linked, service worker active, all PWA meta tags present — ✅ Completed: 20 Feb 2026, 22:30
- [x] Test on iPhone: add to home screen, verify fullscreen launch, verify no browser chrome visible, fix iOS safe area issues — ✅ Completed: 20 Feb 2026, 21:15
- [ ] Test on Android: same checks — deferred, no Android device available currently. Will test when device is sourced.
- [x] Verify there are no horizontal scroll issues, no layout shifts on load, no janky scrolling in content areas — ✅ Completed: 20 Feb 2026, 21:15
- ~~Apply Restore Britain brand colours and fonts to the shell~~ — moved to Phase 1.8 (awaiting brand assets, not blocking)
- [x] Commit and push: `git commit -m "Phase 1.3: PWA shell, manifest, service worker, core layout"` — ✅ Completed: 21 Feb 2026, 19:54

---

### Phase 1.4 — Interactive Map

**What this phase covers:** The centrepiece. An interactive map of Great Britain and Northern Ireland showing the ~12 regions as coloured, tappable polygons. Smooth pinch-to-zoom and panning. Tap on a region to select it.

**Estimated time:** 2-3 days (this is the highest-risk phase — GeoJSON sourcing and rendering can be fiddly)

#### Milestone: The map renders all ~12 UK regions as distinct coloured polygons on a clean base map. The user can pinch-to-zoom and pan smoothly with native-feeling inertia. Tapping a region highlights it and triggers the region detail view (Phase 1.5). The map loads in under 2 seconds on 4G. The map opens framing the entire UK via fitBounds, adapting to any viewport.

**Tasks:**

- [x] ⚠️ Source GeoJSON boundary data for UK regions from the ONS Open Geography Portal — 9 English regions (Regions EN BUC) + 3 devolved nations (Countries UK BUC, excluding England) — ✅ Completed: 20 Feb 2026, 22:38
- [x] Evaluate GeoJSON file size and simplify polygons — used Douglas-Peucker algorithm to simplify country boundaries from full-detail (225K vertices) to BUC-equivalent density (~3.8K vertices). Final merged file: 172 KB for 12 features. — ✅ Completed: 20 Feb 2026, 22:42
- [x] Install and configure MapLibre GL JS in the React project — ✅ Completed: 20 Feb 2026, 22:43
- [x] Create a custom map style: tile-free, sea-blue background (#dbe9f4), GeoJSON polygons rendered directly (DEC-015) — ✅ Completed: 20 Feb 2026, 22:45
- [x] Render all 12 regions as filled polygons with distinct muted colours and white borders — ✅ Completed: 20 Feb 2026, 22:45
- [x] Implement tap/click interaction: tapping a region highlights it (brighter fill via separate highlight layer) and stores selected region ID in state — ✅ Completed: 20 Feb 2026, 22:45
- [x] Implement pinch-to-zoom with smooth momentum/inertia — MapLibre handles natively, rotation disabled for choropleth clarity — ✅ Completed: 20 Feb 2026, 22:45
- [x] Implement pan with momentum — MapLibre native, bounded to UK area (-12,49 to 3,61) — ✅ Completed: 20 Feb 2026, 22:45
- [x] Set appropriate min/max zoom levels: min 4.5 (full UK), max 8 (regional detail) — ✅ Completed: 20 Feb 2026, 22:45
- ~~Add "Find My Region" button~~ — **Deferred** to Phase 1.5 or later. Geolocation auto-select removed to simplify the map for MVP; users select their region manually. May revisit when constituency-level detail is added. See DEC-017.
- ~~Implement point-in-polygon check~~ — **Deferred** alongside Find My Region. Dead code (`pointInPolygon.ts`, `FindMyRegionButton.tsx`) to be deleted. See DEC-017.
- [x] Fix GeoJSON winding order — all 174 polygon rings had incorrect winding (CW instead of CCW). Fixed via shoelace-formula rewind script. See DEC-018. — ✅ Completed: 20 Feb 2026, 23:20
- [x] Fix diagonal rendering lines — root cause was alpha compositing: `fill-opacity < 1.0` causes WebGL to double-blend at earcut triangle seams. Fixed by pre-blending colours with sea background and rendering at `fill-opacity: 1.0`. See DEC-019. — ✅ Completed: 21 Feb 2026, 13:45
- [x] Test on mobile: 60fps panning/zooming confirmed, no rendering artefacts — ✅ Completed: 21 Feb 2026, 13:50
- [x] Remove Shetland and Orkney islands — 37 polygon parts removed from Scotland to prevent map skewing north-east on mobile. UK_BOUNDS and MAX_BOUNDS tightened. See DEC-020. — ✅ Completed: 20 Feb 2026, 23:35
- [x] Cache GeoJSON data in service worker — added to PRECACHE_URLS, bumped CACHE_VERSION to rb-v3 — ✅ Completed: 20 Feb 2026, 22:46
- [x] Test on mobile: verify 60fps panning and zooming, no stuttering, no white tiles during fast panning — Dennis to test on iPhone — ✅ Completed: 21 Feb 2026, 19:54
- [x] Test: tap regions and confirm correct selection and highlight — verified on desktop via browser, all 12 regions selectable — ✅ Completed: 20 Feb 2026, 22:50
- [x] Commit and push: `git commit -m "Phase 1.4: Interactive map with regional boundaries"` — ✅ Completed: 21 Feb 2026, 19:54

---

### Phase 1.5 — Region Detail View & Member Profiles

**What this phase covers:** When a user taps a region on the map, a detail panel slides up showing the region's information, Telegram group link, and member count. Users also need a basic profile page to view and edit their own info.

**Estimated time:** 1-2 days

#### Milestone: Tapping a region on the map triggers a smooth bottom-sheet panel showing region name, description, member count, and a "Join Telegram Group" button that opens the correct Telegram group. The user's profile page displays their display name, email, region, X handle (linked), and join date. The user can edit their display name and X handle. Region assignment from postcode works during onboarding.

**Tasks:**

- [x] Build the region detail bottom-sheet component: slides up from bottom of screen with smooth CSS transform animation, swipe-to-dismiss (80px threshold), overlay tap to dismiss. See DEC-022. — ✅ Completed: 21 Feb 2026, 14:00
- [x] Bottom sheet content: region name (large), description, member count (from `regions.member_count`), regional leader placeholder ("—"), Telegram button. Data fetched from Supabase by mapping feature IDs to region names. — ✅ Completed: 21 Feb 2026, 14:00
- [x] Add "Join Telegram Group" button: opens `telegram_group_url` from region record, shows "coming soon" placeholder if URL not set — ✅ Completed: 21 Feb 2026, 14:00
- [x] Wire up map tap → bottom sheet: MapView manages selectedRegionId state, passes onRegionSelect and onBackgroundClick to RegionMap, renders RegionBottomSheet — ✅ Completed: 21 Feb 2026, 14:10
- [x] Implement postcode-to-region assignment: 124-entry client-side lookup table (121 UK postcode areas + 3 Crown Dependencies) mapping 1-2 letter prefixes to region names. See DEC-023. — ✅ Completed: 21 Feb 2026, 14:20
- [x] Build onboarding page: standalone page at `/onboarding` with postcode input, live region detection, confirm/skip buttons. Stores `postcode_area` and `region_id` on profile. — ✅ Completed: 21 Feb 2026, 14:25
- [x] Store `postcode_area` and `region_id` on the user's profile after assignment — ✅ Completed: 21 Feb 2026, 14:25
- [x] Gate onboarding via ProtectedRoute: redirects to /onboarding if profile exists but region_id is null. Location check prevents redirect loop. — ✅ Completed: 21 Feb 2026, 14:30
- [x] Write SQL trigger for `regions.member_count` maintenance: BEFORE INSERT OR UPDATE on profiles, auto-increments/decrements with clamp to 0. See DEC-024. Saved to `supabase/migrations/002_member_count_trigger.sql`. — ✅ Completed: 21 Feb 2026, 14:43
- [x] ⚠️ **Dennis to run:** Execute `002_member_count_trigger.sql` in Supabase SQL Editor, then run the one-time reconciliation query in the comments to sync existing data
- [x] Profile page enhanced: added region name display (fetched from Supabase), shown between X Handle and Verified fields — ✅ Completed: 21 Feb 2026, 14:35
- [x] Profile page already built in Phase 1.3 with edit capability for display_name and x_handle, success/error feedback — carried forward
- [x] Profile page already wired to "Profile" tab in bottom navigation — carried forward from Phase 1.3
- [x] Test: complete the full flow — register → enter postcode → assigned to correct region → see region on map → tap region → see detail panel with Telegram link → visit profile page → edit display name → save successfully — ✅ Completed: 21 Feb 2026, 19:54
- [x] Commit and push: `git commit -m "Phases 1.1–1.5"` — ✅ Completed: 21 Feb 2026, 19:56

---

### Phase 1.6 — gb/ Boards: In-App Community Forum

**What this phase covers:** Building an in-app discussion forum branded as "gb/ Boards" — replacing the Telegram group architecture entirely. Posts with titles, bodies, and image uploads. Threaded comments. Reddit-style upvote/downvote voting. Sort by Hot, New, and Top. All gated behind membership — only verified members can view or participate. Telegram/X recommended for private messaging but all community discussion lives in-app. Full design doc: `docs/phase-1.6-gb-boards.md`.

**Estimated time:** 2-3 days

#### Milestone: gb/national board is live. Verified members can create posts (with optional image uploads up to 4 per post), comment on posts (with optional images), upvote/downvote posts and comments, and sort the feed by Hot/New/Top. The "Join Telegram Group" button on the region bottom sheet is replaced with a board link. A "Boards" tab appears in the bottom navigation between Map and Profile. The full flow works on mobile: create post → view post → comment → vote → sort → upload image.

**Tasks:**

*Database (Step 1):*
- [x] ⚠️ Write migration `supabase/migrations/003_boards_and_posts.sql`: create `boards`, `posts`, `comments`, `votes` tables with all columns, constraints, and indexes — ✅ Completed: 21 Feb 2026, 20:15
- [x] Add RLS policies to all 4 new tables (verified members can read/write, authors can edit/delete within 15 min window, votes are per-user) — ✅ Completed: 21 Feb 2026, 20:15
- [x] Create triggers: `comment_count`, `last_comment_at`, `upvote_count`, `post_count`, `updated_at` maintenance — ✅ Completed: 21 Feb 2026, 20:15
- [x] Create Supabase Storage bucket `board-images` with upload policies (authenticated users, 5MB max, image MIME types only) — ✅ Completed: 21 Feb 2026, 20:15 — bucket creation included in migration SQL via INSERT INTO storage.buckets
- [x] Seed gb/national board: `INSERT INTO boards (name, slug, description, scope_type) VALUES ('National', 'national', 'The national discussion board for all Restore Britain members.', 'national')` — ✅ Completed: 21 Feb 2026, 20:15
- [ ] ⚠️ **Dennis to run:** Execute `003_boards_and_posts.sql` in Supabase SQL Editor. The storage bucket is created automatically by the migration SQL.
- [x] Log decisions DEC-025 through DEC-030 in `decisions-log.md` — ✅ Completed: 21 Feb 2026, 20:27 — Already logged by previous session

*Data API layer (Step 2):*
- [x] Create `src/lib/boardsApi.ts` — all Supabase queries: `fetchBoards()`, `fetchPosts(boardId, sort, cursor)`, `fetchPost(postId)`, `fetchComments(postId)`, `createPost()`, `createComment()`, `castVote()`, `removeVote()`, `uploadImage()` — ✅ Completed: 21 Feb 2026, 20:18

*Routing & navigation (Step 3):*
- [x] Add routes to `App.tsx`: `/boards`, `/boards/:slug`, `/boards/:slug/new`, `/boards/:slug/:id` — all inside ProtectedRoute + AppShell — ✅ Completed: 21 Feb 2026, 20:20
- [x] Add "Boards" tab to `AppShell.tsx` bottom nav (3 tabs: Map | Boards | Profile) — ✅ Completed: 21 Feb 2026, 20:20
- [x] Update `RegionBottomSheet.tsx`: remove Telegram button, add "View Board" link (or "coming soon" for regions without a board yet) — ✅ Completed: 21 Feb 2026, 20:21

*Board list & board view (Step 4):*
- [x] Build `BoardList.tsx` — list of all boards (gb/national for MVP), each showing name, description, post count, latest activity — ✅ Completed: 21 Feb 2026, 20:22
- [x] Build `BoardView.tsx` — post feed with Hot/New/Top sort tabs, post cards, floating "+" compose button, cursor-based pagination — ✅ Completed: 21 Feb 2026, 20:22
- [x] Build `PostCard.tsx` — reusable post list item: title, author, time-ago, body preview, image thumbnail, upvote count, comment count — ✅ Completed: 21 Feb 2026, 20:22
- [x] Build `SortTabs.tsx` — Hot | New | Top pill toggle — ✅ Completed: 21 Feb 2026, 20:22
- [x] Build `TimeAgo.tsx` — timestamp → "2m ago" / "3h ago" / "1d ago" utility — ✅ Completed: 21 Feb 2026, 20:22

*Post detail & comments (Step 5):*
- [x] Build `NewPost.tsx` — compose screen: title (300 char max), body (auto-expanding textarea), image attach (max 4), post button — ✅ Completed: 21 Feb 2026, 20:24
- [x] Build `PostDetail.tsx` — full post display with images, vote buttons, comment thread below, sticky comment composer at bottom — ✅ Completed: 21 Feb 2026, 20:24
- [x] Build `CommentItem.tsx` — single comment: author, time-ago, body, images, upvote/downvote, reply button, reply-to indicator — ✅ Completed: 21 Feb 2026, 20:24

*Voting (Step 6):*
- [x] Build `VoteButton.tsx` — upvote/downvote arrows with count, optimistic UI (instant update, rollback on error), debounced taps — ✅ Completed: 21 Feb 2026, 20:23

*Image uploads (Step 7):*
- [x] Build `ImageUploader.tsx` — file pick, client-side resize (max 1200px), EXIF strip via canvas re-export, compress to 80% JPEG, upload to Supabase Storage, return public URL — ✅ Completed: 21 Feb 2026, 20:24
- [x] Build `ImageCarousel.tsx` — swipeable multi-image display with dot indicators, single image displayed full-width — ✅ Completed: 21 Feb 2026, 20:24

*Polish & testing (Step 8):*
- [x] Add empty states: "No posts yet — be the first to start a discussion", "No comments yet" — ✅ Completed: 21 Feb 2026, 20:25
- [x] Add loading skeletons for post list and post detail — ✅ Completed: 21 Feb 2026, 20:25
- [x] Add error handling for all API calls (toast or inline error messages) — ✅ Completed: 21 Feb 2026, 20:25
- [ ] Test full flow on iPhone: create post → view post → comment → vote → change sort → upload image → verify images display
- [ ] Verify RLS: confirm unauthenticated users cannot access any board content

*Username system (replaces display_name — see DEC-031):*
- [x] Write migration SQL `004_username_replaces_display_name.sql`: add `username` column (3-20 chars, unique case-insensitive), generate placeholders for existing accounts, drop `display_name`, update `handle_new_user()` trigger — ✅ Completed: 21 Feb 2026, 22:00
- [x] Update `useAuth.tsx` Profile type: `display_name` → `username` — ✅ Completed: 21 Feb 2026, 22:05
- [x] Update `Register.tsx`: username field replaces display name with live validation — ✅ Completed: 21 Feb 2026, 22:10
- [x] Update Edge Function `register/index.ts`: `display_name` → `username` — ✅ Completed: 21 Feb 2026, 22:15
- [x] Update `Profile.tsx`: display and edit @username instead of display_name — ✅ Completed: 21 Feb 2026, 22:20
- [x] Update `boardsApi.ts`: query `username` instead of `display_name` in all joins — ✅ Completed: 21 Feb 2026, 23:30
- [x] Update `PostCard.tsx`, `CommentItem.tsx`, `PostDetail.tsx`, `BoardView.tsx`: clickable @username links with `onUsernameClick` callback — ✅ Completed: 21 Feb 2026, 23:50
- [x] Create `UserProfileModal.tsx`: slide-up bottom sheet showing user profile when @username clicked — ✅ Completed: 22 Feb 2026, 00:10
- [x] Add CSS for `.username-link` and `.user-profile-*` styles in `global.css` — ✅ Completed: 22 Feb 2026, 00:15
- [x] Update `Dashboard.tsx`: replace display_name with @username — ✅ Completed: 22 Feb 2026, 00:20
- [x] Run migration 004 on Supabase: all 3 batches successful, verified with SELECT query — ✅ Completed: 22 Feb 2026, 00:40
- [x] Log decision DEC-031 in `decisions-log.md` — ✅ Completed: 22 Feb 2026, 00:45
- [x] ⚠️ Deploy updated Edge Function `register/index.ts` to Supabase (username replaces display_name) — ✅ Completed: 22 Feb 2026, 01:00
- [x] Verify end-to-end: refresh app, check Profile page shows @username, boards show clickable @username links, UserProfileModal works — ✅ Completed: 22 Feb 2026, 01:05

*Reddit-style threaded comments (see DEC-032):*
- [x] Rewrite `CommentItem.tsx`: recursive tree rendering with depth-based indentation, vertical threading lines, collapsible branches — ✅ Completed: 22 Feb 2026, 01:30
- [x] Update `PostDetail.tsx`: add `buildCommentTree()` function to convert flat comments to nested tree, render root comments with `depth={0}` — ✅ Completed: 22 Feb 2026, 01:30
- [x] Replace flat comment CSS with threaded styles: `.comment-thread`, `.comment-thread-line`, `.comment-collapse-btn`, `.comment-children` — ✅ Completed: 22 Feb 2026, 01:35
- [x] Verify TypeScript compiles cleanly — ✅ Completed: 22 Feb 2026, 01:40
- [x] Browser test: threading, indentation, collapse/expand all working correctly — ✅ Completed: 22 Feb 2026, 01:45

*Comment soft-delete and UI improvements (see DEC-033):*
- [x] Write migration `005_comment_soft_delete_rls.sql`: update RLS policies to allow reading soft-deleted comments and allow authors to delete at any time — ✅ Completed: 22 Feb 2026, 02:00
- [x] Run migration 005 on Supabase — ✅ Completed: 22 Feb 2026, 02:10
- [x] Add `deleteComment()` to `boardsApi.ts`: soft-delete sets `deleted_at`, clears body and images — ✅ Completed: 22 Feb 2026, 02:00
- [x] Update `CommentItem.tsx`: delete button (own comments only), inline "Delete? Yes / No" confirmation, [deleted] placeholder rendering, larger font sizes and interactive hover styles — ✅ Completed: 22 Feb 2026, 02:05
- [x] Update `PostDetail.tsx`: `handleDeleteComment` callback, pass `onDelete` to CommentItem — ✅ Completed: 22 Feb 2026, 02:05
- [x] Update `global.css`: larger comment typography (1rem body, 0.9375rem meta), interactive action button styles, delete confirmation styles — ✅ Completed: 22 Feb 2026, 02:05
- [x] Browser test: post comment → delete button visible on own comment → inline confirmation → confirm delete → [deleted] placeholder renders, comment count decrements — ✅ Completed: 22 Feb 2026, 02:20
- [x] Log decision DEC-033 in `decisions-log.md` — ✅ Completed: 22 Feb 2026, 02:25

**Role system and moderation (see DEC-034):**
- [x] Write migration `006_role_system.sql`: role column, CHECK constraint, Dennis as super_admin, helper functions (`role_level`, `get_current_user_role`, `is_current_user_at_least`, `get_current_user_region_id`), updated RLS policies for posts/comments/invite_codes, `protect_role_column` trigger — ✅ Completed: 22 Feb 2026, 20:30
- [x] Run migration 006 on Supabase, verify Dennis is super_admin — ✅ Completed: 22 Feb 2026, 20:35
- [x] Update `useAuth.tsx`: `Role` type, `ROLE_LEVEL` map, `role` on Profile interface, `isAtLeast()` and `canModerateBoard()` helpers — ✅ Completed: 22 Feb 2026, 20:45
- [x] Add `lockPost()` and `softDeletePost()` to `boardsApi.ts` — ✅ Completed: 22 Feb 2026, 20:45
- [x] Update `CommentItem.tsx`: `canModerate` prop, "Mod Delete" button for moderators — ✅ Completed: 22 Feb 2026, 20:50
- [x] Update `PostDetail.tsx`: fetch board for scope_id, moderation toolbar (Lock/Unlock, Delete Post), lock icon on title, locked notice — ✅ Completed: 22 Feb 2026, 20:50
- [x] Update `PostCard.tsx`: lock icon on locked post titles — ✅ Completed: 22 Feb 2026, 20:50
- [x] Create `AdminPanel.tsx`: member list with roles, role dropdown (super_admin only), invite code viewer with status — ✅ Completed: 22 Feb 2026, 20:55
- [x] Add `/admin` route in `App.tsx` — ✅ Completed: 22 Feb 2026, 20:55
- [x] Add moderation, admin panel, lock, and role badge CSS to `global.css` — ✅ Completed: 22 Feb 2026, 20:55
- [x] TypeScript compile check: zero errors — ✅ Completed: 22 Feb 2026, 21:00
- [x] Browser test: Lock/Unlock toggles correctly, Mod Delete visible on others' comments, Admin Panel shows members and invite codes — ✅ Completed: 22 Feb 2026, 21:05
- [x] Log decision DEC-034 in `decisions-log.md` — ✅ Completed: 22 Feb 2026, 21:10

*Super admin role editing fix (see DEC-035):*
- [x] Write migration `007_super_admin_can_update_profiles.sql`: add RLS policy allowing super_admins to update any profile row — ✅ Completed: 22 Feb 2026, 21:30
- [x] Run migration 007 on Supabase — ✅ Completed: 22 Feb 2026, 21:35
- [x] Update AdminPanel `handleRoleChange`: add post-update verification (re-fetch and compare), revert on mismatch — ✅ Completed: 22 Feb 2026, 21:40
- [x] Browser test: change role → reload → confirm persistence → revert — ✅ Completed: 22 Feb 2026, 21:45
- [x] Log decision DEC-035 in `decisions-log.md` — ✅ Completed: 22 Feb 2026, 22:30

*Invite code rework (see DEC-036):*
- [x] Write migration `008_invite_code_rework.sql`: wipe old codes, simplify to single-use schema, add used_by/used_at/created_by, code generation functions, seed 20 codes — ✅ Completed: 22 Feb 2026, 22:00
- [x] Run migration 008 on Supabase — ✅ Completed: 22 Feb 2026, 22:20
- [x] Update `register` Edge Function for new single-use schema — ✅ Completed: 22 Feb 2026, 22:10
- [x] Rewrite AdminPanel invite codes tab: card-based UI, stats bar, used/available filter, tap-to-copy, Generate 10 codes button — ✅ Completed: 22 Feb 2026, 22:15
- [x] Update Register.tsx: 8-char code input with monospace font, auto-uppercase, maxLength — ✅ Completed: 22 Feb 2026, 22:15
- [x] Add invite code card CSS to global.css — ✅ Completed: 22 Feb 2026, 22:15
- [x] Browser test: view 20 codes, generate 10 more (30 total), tap-to-copy, stats update correctly — ✅ Completed: 22 Feb 2026, 22:30
- [x] Log decision DEC-036 in `decisions-log.md` — ✅ Completed: 22 Feb 2026, 22:30

*Regional boards and national pinning (see DEC-037):*
- [x] Write migration `009_regional_boards.sql`: add sort_order column, seed 12 regional boards linked to regions, pin national board — ✅ Completed: 22 Feb 2026, 23:40
- [x] Run migration 009 on Supabase — ✅ Completed: 22 Feb 2026, 23:42
- [x] Update `boardsApi.ts`: add sort_order to Board type, update fetchBoards to sort by sort_order then name — ✅ Completed: 22 Feb 2026, 23:38
- [x] Update `BoardList.tsx`: split into pinned national section and regional section with divider — ✅ Completed: 22 Feb 2026, 23:38
- [x] Add CSS for pinned board card and section divider — ✅ Completed: 22 Feb 2026, 23:38
- [x] Fix Edge Function deploy path: move from `supabase/supabase/functions/` to `supabase/functions/` — ✅ Completed: 22 Feb 2026, 23:43
- [x] Browser test: 13 boards visible (1 national pinned + 12 regional), correct ordering — ✅ Completed: 22 Feb 2026, 23:44
- [x] Log decision DEC-037 in `decisions-log.md` — ✅ Completed: 22 Feb 2026, 23:45

*Commit:*
- [x] Commit and push: `git commit -m "feat: admin fixes, invite code rework, regional boards"` — ✅ Completed: 22 Feb 2026, 23:55

---

### Phase 1.7 — Deployment & Going Live

**What this phase covers:** Deploying the app to a real URL, configuring the domain, ensuring HTTPS and security headers are in place, and verifying everything works in production (not just locally). Telegram integration from Phase 1.6 is verified as part of the production smoke test.

**Estimated time:** 0.5-1 day

#### Milestone: The app is live at a real URL (either a Vercel/Cloudflare subdomain or a custom domain), served over HTTPS with all security headers configured. The PWA installs correctly from the live URL. Registration, login, map, region details, Telegram group links, and profile all work in production. Performance: First Contentful Paint under 2 seconds on 4G.

**Tasks:**

- [x] ⚠️ Choose hosting platform (Vercel or Cloudflare Pages) and log decision in DECISIONS.md — Cloudflare Pages chosen. See DEC-038. ✅ Completed: 22 Feb 2026, 23:55

*Pre-deploy code fixes:*
- [x] Fix `vite.config.ts`: remove hardcoded `cacheDir: '/tmp/.vite'` (VM-only path, breaks on Cloudflare build servers) — ✅ Completed: 22 Feb 2026, 17:30
- [x] Create `public/_redirects`: SPA catch-all (`/* /index.html 200`) so direct URL navigation works — ✅ Completed: 22 Feb 2026, 17:30
- [x] Create `public/_headers`: security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP) — ✅ Completed: 22 Feb 2026, 17:30
- [x] Bump service worker cache version `rb-v3` → `rb-v4` (force fresh caches on production) — ✅ Completed: 22 Feb 2026, 17:30
- [x] Create `.node-version` file set to `18` (Cloudflare defaults to Node 12 otherwise) — ✅ Completed: 22 Feb 2026, 17:30
- [x] Commit and push pre-deploy changes — ✅ Completed: 22 Feb 2026, 17:45

*Cloudflare Pages setup:*
- [x] Create Cloudflare Pages project connected to `DennisHStevens/restore-britain-app` GitHub repo — ✅ Completed: 22 Feb 2026, 18:00
- [x] Configure build: command `npm run build`, output directory `dist` — ✅ Completed: 22 Feb 2026, 18:00
- [x] Set environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only (NOT the service role key — that's server-side only) — ✅ Completed: 22 Feb 2026, 18:00
- [x] Trigger first deploy — verify build succeeds with no errors — ✅ Completed: 22 Feb 2026, 18:00

*Post-deploy verification:*
- [x] Update Supabase Auth "Site URL" setting to the new Cloudflare Pages URL — ✅ Completed: 22 Feb 2026, 18:10
- [x] Verify HTTPS is enforced (no HTTP access possible) — ✅ Completed: 22 Feb 2026, 18:10 (Cloudflare enforces HTTPS by default)
- [x] Test the full flow on the live URL: open URL → login → map loads → tap region → see detail panel → boards → post → profile → edit profile — ✅ Completed: 22 Feb 2026, 19:00
- [x] Verify Supabase Edge Functions work in production (register with an invite code) — ✅ Completed: 22 Feb 2026, 19:15 (Dennis confirmed registration and login work on live URL)
- [x] Test PWA install from the live URL: "Add to Home Screen" on iOS, verify fullscreen launch — ✅ Completed: 22 Feb 2026, 19:15 (Dennis confirmed Add to Home Screen works)
- [x] Run a Lighthouse audit: target scores of 90+ on Performance, Accessibility, Best Practices, and PWA — ✅ Completed: 22 Feb 2026, 19:30. Results: Performance 85, Accessibility 97, Best Practices 100, SEO 91. FCP 3.3s (slow 4G sim), TBT 30ms, CLS 0. Performance improvements deferred to Phase 1.8.
- [ ] Optional: connect a custom domain if one has been purchased. Configure DNS, verify SSL certificate.
- [x] Commit and push any post-deploy config — ✅ Completed: 22 Feb 2026, 19:00 (multiple commits: CSP fix, static GeoJSON import, repaint fix)

*Production map rendering fixes (added during deployment):*
- [x] Fix CSP headers: add `blob:` to `script-src`, add `worker-src 'self' blob:` and `child-src 'self' blob:` for MapLibre web workers — ✅ Completed: 22 Feb 2026, 18:15
- [x] Fix MapLibre GeoJSON loading: static import at build time via Vite (bypasses blob: worker fetch failure on Cloudflare Pages) — ✅ Completed: 22 Feb 2026, 18:45
- [x] Add `map.resize()` + `map.triggerRepaint()` after layer setup to force canvas paint with synchronous data — ✅ Completed: 22 Feb 2026, 19:00

*PWA install guide (added post-deployment):*
- [x] Create `InstallGuide.tsx` component with platform detection (iOS/Android/Desktop) and `beforeinstallprompt` handling — ✅ Completed: 22 Feb 2026, 19:15
- [x] Add install-guide step to `Onboarding.tsx` — shown before region selection, skipped if PWA already installed — ✅ Completed: 22 Feb 2026, 19:15

---

### Phase 1.7.2 — Project Folder Cleanup & Organisation

**What this phase covers:** Tidying up the project directory structure after rapid development. Removing dead files, fixing inconsistent paths, organising migrations, and ensuring the repo is clean and navigable.

**Estimated time:** 0.5 day

#### Milestone: The project folder is clean, well-organised, and free of dead code, duplicate files, or orphaned directories. A new developer could clone the repo and immediately understand the structure.

**Tasks:**

- [x] Audit and remove the nested `supabase/supabase/` directory (legacy duplicate from early setup — functions, migrations, seeds duplicated at wrong path) — ✅ Completed: 22 Feb 2026, 19:25. Confirmed identical to canonical. Moved to `rubbish/supabase-nested-duplicate`.
- [x] Verify `supabase/functions/register/index.ts` is the canonical Edge Function location — ✅ Completed: 22 Feb 2026, 19:25. Confirmed canonical; nested duplicate was byte-identical.
- [x] Audit `public/icons/` — there's a double-nested `icons/icons/` path referenced in manifest.json and service worker. Flatten if needed or verify it's correct. — ✅ Completed: 22 Feb 2026, 19:25. Flattened: icons now at `/icons/icon-192.png` and `/icons/icon-512.png`. Updated manifest.json and sw.js. Old nested dir moved to `rubbish/icons-nested-duplicate`.
- [x] Remove any `.DS_Store` files from the repo — ✅ Completed: 22 Feb 2026, 19:25. Moved `supabase/.DS_Store` to `rubbish/`. `.gitignore` already excludes `.DS_Store`.
- [x] Review all migration files (001–009) are correctly numbered and contain accurate header comments — ✅ Completed: 22 Feb 2026, 19:25. All 9 migrations correctly numbered with clear descriptive headers.
- [x] Verify `.gitignore` covers all necessary exclusions (node_modules, .env.local, .DS_Store, dist, etc.) — ✅ Completed: 22 Feb 2026, 19:25. Added `rubbish/` exclusion. All other entries already correct.
- [x] Run `npx tsc --noEmit` and `npm run build` — verify zero errors, zero warnings — ✅ Completed: 22 Feb 2026, 19:25. TypeScript compiles clean, zero errors.
- [x] Audit `package.json`: update name from `restore-britain-temp` to `restore-britain-app` — ✅ Completed: 22 Feb 2026, 19:25.
- [ ] Commit and push: `git commit -m "Phase 1.7.2: Project folder cleanup and organisation"`

---

### Phase 1.8 — Brand Assets & Visual Polish

**What this phase covers:** Sourcing Restore Britain's official brand assets, populating the `/brand` skeleton folder (already created with placeholder structure), integrating the theme into the codebase so colours/fonts propagate automatically, and applying the visual identity across every screen. This phase runs in parallel with others — sourcing starts day 1, integration happens once assets arrive and the frontend exists.

**Estimated time:** Ongoing alongside other phases, 1 day of dedicated integration work

#### Milestone: All placeholder values in `/brand/theme.json` are replaced with real Restore Britain brand values. Logo files exist in `/brand/logos/`. CSS custom properties (or Tailwind config) are generated from `theme.json` and used across the entire app — no hardcoded colour values anywhere. The logo appears in the header, login page, and PWA splash screen. The map uses brand-consistent colours. The app looks like an official Restore Britain product, not a generic template.

**Tasks:**

*Sourcing (should already be done — see Phase 1.1 brand outreach task):*
- [x] ⚠️ Confirm brand asset request was sent in Phase 1.1. If not, send it now — this is the bottleneck. Request: logo files (SVG preferred, highest resolution PNG acceptable), exact hex codes for their colour palette, font names or files, any existing brand guidelines document — ✅ Completed: 22 Feb 2026, 22:15
- [x] If brand guidelines document exists, save it to `/brand/` as reference — ✅ Completed: 22 Feb 2026, 22:15

*Populating the skeleton folder:*
- [x] Place logo files in `/brand/logos/` following the naming conventions in `/brand/logos/README.md` — ✅ Completed: 22 Feb 2026, 22:15
- [x] Generate PWA icons (192x192, 512x512 PNG) from the logo SVG/source file, save to `/brand/logos/` — ✅ Completed: 22 Feb 2026, 22:15
- [x] Generate `favicon.ico` from the logo, save to `/brand/logos/` — ✅ Completed: 22 Feb 2026, 22:15
- [x] Update `/brand/theme.json`: replace all `#000000` and `PLACEHOLDER` values with official brand colours, font names, and PWA colours — ✅ Completed: 22 Feb 2026, 22:15
- [x] If using self-hosted fonts, place `.woff2` files in `/brand/fonts/`. If using Google Fonts, update the `googleFontsUrl` in `theme.json` — ✅ Completed: 22 Feb 2026, 22:15

*Codebase integration:*
- [x] Create a theme utility that reads `/brand/theme.json` and generates CSS custom properties (e.g., `--color-primary: #XXXXX`) injected at the document root — ✅ Completed: 22 Feb 2026, 22:15
- [x] If using Tailwind: extend `tailwind.config.js` to pull colours and fonts from `theme.json` so Tailwind classes use brand values — ✅ Completed: 22 Feb 2026, 22:15
- [x] Create a `@font-face` declaration or Google Fonts `<link>` based on the `fontSource` value in `theme.json` — ✅ Completed: 22 Feb 2026, 22:15
- [x] Audit every component and replace any hardcoded colour values with CSS custom property references or Tailwind brand classes — ✅ Completed: 22 Feb 2026, 22:15
- [x] Update `manifest.json` theme colour and background colour to match `theme.json` PWA values — ✅ Completed: 22 Feb 2026, 22:15

*Applying the brand:*
- [x] Place logo in the app header (all authenticated pages) — ✅ Completed: 22 Feb 2026, 22:15
- [x] Place logo on the login and registration pages — ✅ Completed: 22 Feb 2026, 22:15
- [x] Apply brand fonts to headings and body text globally — ✅ Completed: 22 Feb 2026, 22:15
- [x] Apply brand colours to UI elements: buttons, headers, navigation bar, links, input fields, cards — ✅ Completed: 22 Feb 2026, 22:15
- [x] Apply brand colours to the map: update MapLibre style using `theme.json` map colour values for region fills, borders, hover states, selection states, sea and land backgrounds — ✅ Completed: 22 Feb 2026, 22:15
- [x] Ensure the bottom sheet (region detail view) uses brand colours and fonts consistently — ✅ Completed: 22 Feb 2026, 22:15

*Lighthouse performance improvements (from Phase 1.7 audit — Performance 85, target 90+):*
- [ ] Add `<main>` landmark to all page layouts (Accessibility: "Document does not have a main landmark" — costs 3 points)
- [ ] Lazy-load MapLibre GL only on the map page (code-splitting) — saves ~324 KiB unused JS on login/boards pages, biggest FCP win
- [ ] Eliminate render-blocking CSS — inline critical CSS or defer non-critical styles (est. 300ms FCP saving)
- [ ] Reduce unused CSS (~14 KiB)
- [ ] Re-run Lighthouse after fixes — target: Performance 90+, Accessibility 100

*Verification:*
- [ ] Visual review: screenshot every screen on a phone (login, registration, map, region detail, profile, profile edit) and verify brand consistency
- [ ] Verify no placeholder `#000000` or `PLACEHOLDER` values remain in `theme.json`
- [ ] Verify no hardcoded colour values exist in any component file (search the codebase for hex codes)
- [ ] Commit and push: `git commit -m "Phase 1.8: Brand assets integrated, theme pipeline live"`

---

### Phase 1.9 — Onboarding First 10 Members

**What this phase covers:** The human side — actually getting 10 real people onto the platform. This is not a technical phase; it's an outreach and onboarding phase. But it's the success criteria for the goal, so it's tracked here.

**Estimated time:** 3-5 days (overlaps with final development)

#### Milestone: 10 verified members have registered on the live platform, each assigned to a region. At least one regional Telegram group exists and is linked from the platform. At least one member other than Dennis has successfully completed the full onboarding flow without guidance (proof that the UX is intuitive enough).

**Tasks:**

- [ ] Verify Telegram groups from Phase 1.6 are active and invite links are working on the live platform
- [ ] Generate 15 invite codes (buffer above the 10-member target)
- [ ] Identify 10+ Restore Britain contacts from your X network to invite
- [ ] Draft a brief onboarding message: what the platform is, what they'll see, what to do first. Keep it to 3-4 sentences max.
- [ ] Send invite codes and the platform URL to your first 10 targets
- [ ] Monitor registrations in Supabase dashboard — track who has registered, which regions they're in
- [ ] Observe at least one member complete the onboarding flow without any personal guidance from you (silent test of UX clarity)
- [ ] Collect informal feedback from early members: what confused them, what felt good, what's missing
- [ ] Document feedback in a new section of this file or a separate FEEDBACK.md for input into Goal 2 planning
- [ ] If any technical issues surface during real-user onboarding, fix them immediately (hotfix priority)
- [ ] Commit and push any hotfixes: `git commit -m "Phase 1.9: Post-onboarding fixes"` (only if changes were made)
- [ ] Update `goals-checklist.md` — mark Goal 1 as complete with final date and member count

---

## GOAL 1 — PHASE SUMMARY & CRITICAL PATH

| Phase | Dependency | Estimated Time | Can Parallelise? |
|---|---|---|---|
| 1.1 Git + Supabase Setup | None | 1 day | No — everything depends on this |
| 1.2 Auth & Gating | 1.1 complete | 1-2 days | No — needs database |
| 1.3 PWA Shell | None | 1 day | **Yes** — can start alongside 1.1 |
| 1.4 Interactive Map | 1.3 complete | 2-3 days | **Yes** — can start alongside 1.2 |
| 1.5 Region Detail & Profiles | 1.1, 1.2, 1.4 complete | 1-2 days | No — needs auth, database, and map |
| 1.6 gb/ Boards & Moderation | 1.1, 1.5 complete | 2-3 days | No — needs auth, database, and map |
| 1.7 Deployment | 1.1-1.6 complete | 0.5-1 day | No — needs everything working |
| 1.8 Brand Assets | None (sourcing), 1.3 (integration) | 0.5 day integration | **Yes** — sourcing starts day 1 |
| 1.9 Onboard Members | 1.7 complete | 3-5 days | Partially — target list can start early |

**Critical path:** 1.1 → 1.2 → 1.5 → 1.6 → 1.7 → 1.9
**Parallel track:** 1.3 + 1.4 can progress while 1.1 and 1.2 are being built
**Telegram group creation** can start immediately (just needs a Telegram account) — linking to the database happens once 1.1 and 1.5 are done
**Brand sourcing** should start immediately — it's the most likely bottleneck if the RB team is slow to respond

**Total estimated development time:** 8-11 working days
**Deadline:** 4 March 2026
**Buffer:** Tight. The parallel tracks and early Telegram/brand sourcing are what make this possible. If the map (Phase 1.4) takes the full 3 days and brand assets are slow to arrive, we'll be right at the wire.

---

## GOAL 2: Quest System, Gamification & Forum (Placeholder)

**Deadline:** TBD — to be defined after Goal 1 is complete and early member feedback is collected
**Scope:** Quest creation and acceptance, XP/levels/achievements/streaks, regional leaderboards, forum system, Telegram bot integration
**Status:** Not yet planned in detail. Will be broken into phases after Goal 1 retrospective.

---

## GOAL 3: Departments, Dashboards & Scale (Placeholder)

**Deadline:** TBD
**Scope:** Online Operations and International departments, leader dashboards, national dashboard with heatmap, cross-regional coordination, constituency unlock system
**Status:** Not yet planned. Depends on Goal 2 completion and membership growth.

---

## Completed Tasks Archive

*When tasks are completed, they can optionally be moved here with completion dates for a historical record.*

---

*Document version: 0.1 — Initial creation with Goal 1 fully broken down*
*Last updated: February 2026*
*Author: Dennis Stevens & Claude (AI-assisted)*
