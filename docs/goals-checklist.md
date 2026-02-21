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
- [ ] Commit all Supabase-related work (any migration files, seed scripts, or config): `git commit -m "Phase 1.1: Supabase setup with tables and RLS"`
- [ ] Push to remote

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
- [ ] Commit and push: `git commit -m "Phase 1.3: PWA shell, manifest, service worker, core layout"`

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
- [ ] Test on mobile: verify 60fps panning and zooming, no stuttering, no white tiles during fast panning — Dennis to test on iPhone
- [x] Test: tap regions and confirm correct selection and highlight — verified on desktop via browser, all 12 regions selectable — ✅ Completed: 20 Feb 2026, 22:50
- [ ] Commit and push: `git commit -m "Phase 1.4: Interactive map with regional boundaries"`

---

### Phase 1.5 — Region Detail View & Member Profiles

**What this phase covers:** When a user taps a region on the map, a detail panel slides up showing the region's information, Telegram group link, and member count. Users also need a basic profile page to view and edit their own info.

**Estimated time:** 1-2 days

#### Milestone: Tapping a region on the map triggers a smooth bottom-sheet panel showing region name, description, member count, and a "Join Telegram Group" button that opens the correct Telegram group. The user's profile page displays their display name, email, region, X handle (linked), and join date. The user can edit their display name and X handle. Region assignment from postcode works during onboarding.

**Tasks:**

- [ ] Build the region detail bottom-sheet component: slides up from bottom of screen with smooth animation, can be dismissed by swiping down or tapping the map
- [ ] Bottom sheet content: region name (large), description, member count (pulled from `regions.member_count`), regional leader info (placeholder text for MVP — "Leader to be announced" unless manually populated)
- [ ] Add "Join Telegram Group" button: opens the `telegram_group_url` from the region record in a new tab / Telegram app deeplink
- [ ] Wire up map tap → bottom sheet: tapping a region on the map opens the bottom sheet for that region, tapping a different region switches the content
- [ ] Implement postcode-to-region assignment: during onboarding (after registration), user enters their postcode. Use the first 1-2 characters of the postcode to map to a region. Build a simple lookup table (e.g., "BS" → South West, "B" → West Midlands, "LS" → Yorkshire, etc.)
- [ ] Store `postcode_area` and `region_id` on the user's profile after assignment
- [ ] Update `regions.member_count` via a database trigger when a profile's `region_id` is set or changed
- [ ] Build the profile page: displays display_name, email (read-only), region name (read-only, with option to change), X handle (linked as `x.com/{handle}`), join date
- [ ] Build profile edit form: editable fields for display_name and x_handle, save button, success/error feedback
- [ ] Wire up profile page to the "Profile" tab in the bottom navigation
- [ ] Test: complete the full flow — register → enter postcode → assigned to correct region → see region on map → tap region → see detail panel with Telegram link → visit profile page → edit display name → save successfully
- [ ] Commit and push: `git commit -m "Phase 1.5: Region detail view, profiles, postcode assignment"`

---

### Phase 1.6 — Telegram Group Architecture

**What this phase covers:** Setting up the full Telegram group structure for the MVP — creating the groups, configuring them properly, populating the database with invite links, and ensuring the platform-to-Telegram handoff is seamless. This is the communications backbone.

**Estimated time:** 0.5-1 day

#### Milestone: A national Telegram group and at least 2-3 regional Telegram groups exist with proper naming conventions, descriptions, and admin settings. All active group invite links are stored in the `regions` table and the "Join Telegram Group" button on each active region's detail view opens the correct group. A clear naming convention and group setup template exists for scaling to all 12 regions.

**Tasks:**

- [ ] Define Telegram group naming convention (e.g., "Restore Britain — National", "Restore Britain — West Midlands", "Restore Britain — South West") and log in DECISIONS.md
- [ ] Create the **National Telegram group**: set name, description ("Official national coordination group for Restore Britain members"), group photo (RB logo)
- [ ] Configure national group settings: admin-only posting disabled (open discussion), slow mode off, invite link set to not expire, group set to private (invite link required, not publicly searchable)
- [ ] Create **2-3 regional Telegram groups** for the regions most likely to have early members (based on your network — likely West Midlands, South West, and one other)
- [ ] Configure each regional group: same settings pattern as national, description includes region name and purpose ("Coordination hub for Restore Britain members in the West Midlands")
- [ ] Document a **group setup template** — a checklist of settings to apply whenever a new regional group is created, so any admin can replicate the setup consistently. Store in the project docs.
- [ ] Copy all group invite links into the `regions` table: update each active region's `telegram_group_url` field
- [ ] Store the national Telegram group link somewhere accessible app-wide (e.g., a `platform_settings` table or hardcoded config for MVP)
- [ ] Test the full handoff: tap "Join Telegram Group" on a region detail view → Telegram opens (or prompts to install) → correct group is shown → user can join
- [ ] Test on both iOS and Android: verify Telegram deeplink (`tg://`) works and falls back to web (`t.me/`) if Telegram isn't installed
- [ ] Assign yourself as admin on all groups. Identify if any of your first 10 members should be co-admins on regional groups.
- [ ] Create a placeholder group description note in each group pinned message: "Welcome to [Region]. This is the official coordination channel for Restore Britain members in [Region]. More details coming soon."
- [ ] Commit and push any database updates (telegram_group_url values): `git commit -m "Phase 1.6: Telegram group architecture and database links"`

---

### Phase 1.7 — Deployment & Going Live

**What this phase covers:** Deploying the app to a real URL, configuring the domain, ensuring HTTPS and security headers are in place, and verifying everything works in production (not just locally). Telegram integration from Phase 1.6 is verified as part of the production smoke test.

**Estimated time:** 0.5-1 day

#### Milestone: The app is live at a real URL (either a Vercel/Cloudflare subdomain or a custom domain), served over HTTPS with all security headers configured. The PWA installs correctly from the live URL. Registration, login, map, region details, Telegram group links, and profile all work in production. Performance: First Contentful Paint under 2 seconds on 4G.

**Tasks:**

- [ ] ⚠️ Choose hosting platform (Vercel or Cloudflare Pages) and log decision in DECISIONS.md
- [ ] Create hosting account and connect to the project's Git repository
- [ ] Configure environment variables on the hosting platform: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Deploy the app — verify successful build with no errors
- [ ] Configure security headers on all responses: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, Content-Security-Policy
- [ ] Verify HTTPS is enforced (no HTTP access possible)
- [ ] Test the full flow on the live URL from a mobile device: open URL → login page → register with invite code → postcode entry → map loads → tap region → see detail panel → Telegram link works and opens correct group → profile page works → edit profile works
- [ ] Test PWA install from the live URL: "Add to Home Screen" on both iOS and Android, verify fullscreen launch
- [ ] Run a Lighthouse audit: target scores of 90+ on Performance, Accessibility, Best Practices, and PWA
- [ ] Optional: connect a custom domain if one has been purchased. Configure DNS, verify SSL certificate.
- [ ] Verify Supabase Edge Functions work in production (invite code verification)
- [ ] Commit and push any deployment config: `git commit -m "Phase 1.7: Production deployment with security headers"`

---

### Phase 1.8 — Brand Assets & Visual Polish

**What this phase covers:** Sourcing Restore Britain's official brand assets, populating the `/brand` skeleton folder (already created with placeholder structure), integrating the theme into the codebase so colours/fonts propagate automatically, and applying the visual identity across every screen. This phase runs in parallel with others — sourcing starts day 1, integration happens once assets arrive and the frontend exists.

**Estimated time:** Ongoing alongside other phases, 1 day of dedicated integration work

#### Milestone: All placeholder values in `/brand/theme.json` are replaced with real Restore Britain brand values. Logo files exist in `/brand/logos/`. CSS custom properties (or Tailwind config) are generated from `theme.json` and used across the entire app — no hardcoded colour values anywhere. The logo appears in the header, login page, and PWA splash screen. The map uses brand-consistent colours. The app looks like an official Restore Britain product, not a generic template.

**Tasks:**

*Sourcing (should already be done — see Phase 1.1 brand outreach task):*
- [ ] ⚠️ Confirm brand asset request was sent in Phase 1.1. If not, send it now — this is the bottleneck. Request: logo files (SVG preferred, highest resolution PNG acceptable), exact hex codes for their colour palette, font names or files, any existing brand guidelines document
- [ ] If brand guidelines document exists, save it to `/brand/` as reference

*Populating the skeleton folder:*
- [ ] Place logo files in `/brand/logos/` following the naming conventions in `/brand/logos/README.md`
- [ ] Generate PWA icons (192x192, 512x512 PNG) from the logo SVG/source file, save to `/brand/logos/`
- [ ] Generate `favicon.ico` from the logo, save to `/brand/logos/`
- [ ] Update `/brand/theme.json`: replace all `#000000` and `PLACEHOLDER` values with official brand colours, font names, and PWA colours
- [ ] If using self-hosted fonts, place `.woff2` files in `/brand/fonts/`. If using Google Fonts, update the `googleFontsUrl` in `theme.json`

*Codebase integration:*
- [ ] Create a theme utility that reads `/brand/theme.json` and generates CSS custom properties (e.g., `--color-primary: #XXXXX`) injected at the document root
- [ ] If using Tailwind: extend `tailwind.config.js` to pull colours and fonts from `theme.json` so Tailwind classes use brand values
- [ ] Create a `@font-face` declaration or Google Fonts `<link>` based on the `fontSource` value in `theme.json`
- [ ] Audit every component and replace any hardcoded colour values with CSS custom property references or Tailwind brand classes
- [ ] Update `manifest.json` theme colour and background colour to match `theme.json` PWA values

*Applying the brand:*
- [ ] Place logo in the app header (all authenticated pages)
- [ ] Place logo on the login and registration pages
- [ ] Apply brand fonts to headings and body text globally
- [ ] Apply brand colours to UI elements: buttons, headers, navigation bar, links, input fields, cards
- [ ] Apply brand colours to the map: update MapLibre style using `theme.json` map colour values for region fills, borders, hover states, selection states, sea and land backgrounds
- [ ] Ensure the bottom sheet (region detail view) uses brand colours and fonts consistently

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
| 1.6 Telegram Architecture | 1.1, 1.5 complete | 0.5-1 day | **Partially** — group creation can start anytime, DB linking needs 1.1 and 1.5 |
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
