# Restore Britain Platform — Decisions Log

### Architectural & Strategic Decision Record

> **Purpose:** This document records every significant decision made during the design and development of the platform. Each entry captures what was decided, when, why, and what alternatives were considered or rejected. This prevents relitigating settled questions and provides a clear audit trail of how the platform's architecture evolved.
>
> Decisions are logged in reverse chronological order (newest first).

---

## Decision Format

Each entry follows this structure:
- **Decision:** What was decided
- **Date:** When the decision was made
- **Context:** What problem or question prompted this
- **Reasoning:** Why this option was chosen
- **Alternatives considered:** What else was on the table
- **Impact:** What this decision affects downstream
- **Status:** Active / Superseded / Under review

---

## Active Decisions

### DEC-044: Delete member Edge Function with server-side auth
**Date:** 22 Feb 2026
**Context:** Super admins need the ability to remove members from the platform. This requires deleting the auth user (Supabase Admin API), the profile row, and freeing up the member's invite code — all privileged operations that cannot be done from the client.
**Decision:** Created a `delete-member` Edge Function that uses the service_role key. The function extracts the caller's JWT from the Authorization header, verifies they are a super_admin via the profiles table, then cascades: reset invite codes → delete profile → delete auth user. JWT gateway verification is disabled (same pattern as DEC-043) because the function handles its own auth internally.
**Alternatives:** Client-side deletion via RLS policies (rejected — RLS can't delete auth users, only profile rows). Direct Admin API calls from client (rejected — would expose service_role key).
**Impact:** Super admins can now delete non-super-admin members from the admin panel. Freed invite codes become available for reuse.
**Status:** Active

---

### DEC-043: Disable JWT verification on register Edge Function
**Date:** 22 Feb 2026
**Context:** Registration was failing with 401 errors. All invocations of the `register` Edge Function returned 401, but no logs appeared in the function's log viewer — meaning Supabase's gateway was rejecting requests before the function code even executed.
**Decision:** Disabled "Verify JWT with legacy secret" toggle on the register Edge Function in the Supabase dashboard. The function handles its own authorisation internally (service_role key, invite code validation), so gateway-level JWT verification is unnecessary and actively harmful for an unauthenticated registration endpoint.
**Alternatives:** Pass a valid JWT from the client (impossible — users don't have accounts yet), deploy with `--no-verify-jwt` flag (same effect but via CLI).
**Impact:** Registration now works correctly. The function's own auth logic (invite code validation, service_role key) provides the security boundary.
**Status:** Active

---

### DEC-042: Brand theme integration from official site
**Date:** 22 Feb 2026
**Context:** We needed official brand assets (colours, fonts, logo) but didn't have a design file. The official Restore Britain site (restorebritain.org.uk) was scraped to extract the brand palette.
**Decision:** Extract colours, fonts, and logo from the live site and codify them in `brand/theme.json`. All CSS custom properties in global.css now derive from this file. Google Fonts (Montserrat for headings, Lato for body) loaded via `<link>` preconnect pattern. RegionMap.tsx imports theme.json directly for map colours. Per-region fill colours in regionColours.ts kept as separate data-viz palette (pre-blended, not brand colours).
**Alternatives:** Wait for official brand kit (unknown timeline), use generic system fonts (less distinctive), embed fonts locally (larger bundle).
**Impact:** `brand/theme.json` now contains all brand values. `global.css` uses CSS custom properties derived from theme. `src/components/map/RegionMap.tsx` imports theme colours. Google Fonts loaded with preconnect hints.
**Status:** Active

---

### DEC-041: PWA install guide as onboarding step
- **Date:** 22 February 2026
- **Context:** Many users won't know how to add a PWA to their home screen. Dennis requested a tutorial that appears after registration but before region selection, showing device-specific instructions.
- **Decision:** Added a step state machine to `Onboarding.tsx`: `'install-guide' | 'region-select'`. The install guide appears first (unless the PWA is already installed, detected via `display-mode: standalone` media query). A new `InstallGuide.tsx` component detects the platform (iOS/Android/Desktop) and shows appropriate instructions. On Android Chrome, it captures the `beforeinstallprompt` event to offer a native "Install" button. On iOS, it shows a visual 3-step guide (Share → Add to Home Screen → Add). On desktop, it shows a brief message.
- **Reasoning:** Embedding the guide as a state step within Onboarding.tsx (rather than a separate route or modal) keeps all onboarding logic in one place. No routing changes needed. The guide naturally appears only once per user because `/onboarding` only renders when `region_id` is null. The standalone detection skips the guide for users who already installed via other means.
- **Alternatives considered:** (1) Separate `/install-guide` route — adds routing complexity for a one-time screen. (2) Modal overlay on the onboarding page — the onboarding page has no visual content to overlay (it's just a card), so a modal would look odd. (3) Post-onboarding popup — less effective, user is already past the commitment point.
- **Impact:** New component, minor modification to Onboarding.tsx. No database changes.
- **Files:**
  - `src/components/onboarding/InstallGuide.tsx` — NEW
  - `src/pages/Onboarding.tsx` — MODIFIED (import, step state, conditional render)
- **Status:** Active

---

### DEC-040: Force repaint after synchronous GeoJSON load
- **Date:** 22 February 2026
- **Context:** After switching to static GeoJSON import, MapLibre's render loop could stall — the data arrives synchronously (already parsed by Vite's JSON import) after the initial style paint, so no new render frame is automatically scheduled. The source showed 29 features loaded and 17 rendered in MapLibre's internal state, but the canvas wasn't being painted.
- **Decision:** Call `map.resize()` followed by `map.triggerRepaint()` at the end of the `map.on('load')` callback, after all layers are added. `resize()` recalculates the viewport dimensions, and `triggerRepaint()` queues the next render frame.
- **Reasoning:** This is a known edge case with MapLibre when source data is available synchronously rather than arriving via an async fetch. The two calls together ensure the GPU pipeline flushes and the canvas is updated. Zero performance cost — it's just scheduling one extra frame.
- **Alternatives considered:** (1) `requestAnimationFrame` wrapper — less reliable, doesn't trigger MapLibre's internal dirty-check. (2) Delay layer addition with `setTimeout` — hacky, introduces visible flash.
- **Impact:** Two lines added to `RegionMap.tsx` inside the load callback.
- **Files:** `src/components/map/RegionMap.tsx` — MODIFIED
- **Status:** Active

---

### DEC-039: Static GeoJSON import (bundled at build time)
- **Date:** 22 February 2026
- **Context:** MapLibre's internal blob: URL web worker could not reliably fetch the GeoJSON file at runtime on Cloudflare Pages. When MapLibre receives a URL as GeoJSON source data, it delegates the fetch to a web worker spawned from a blob: URL. On Cloudflare Pages with an active service worker, the blob-origin worker's fetch requests fail silently — the service worker doesn't intercept blob-origin requests. Initial fix attempt (fetching on the main thread and passing the parsed object) also failed because MapLibre still delegates processing to the blob: worker.
- **Decision:** Import the GeoJSON file as a static Vite JSON import (`import ukRegionsData from '../../data/uk-regions.json'`). This bundles the ~166KB file into the JS bundle (~45KB gzipped). The parsed object is passed directly to `map.addSource()` as data, bypassing any network fetch entirely.
- **Reasoning:** Eliminates all fetch-related failure modes. The GeoJSON is small enough that bundling it adds negligible weight (45KB gzipped). The data is a static asset that never changes at runtime, so there's no benefit to fetching it dynamically. This is the most robust approach for a tile-free choropleth map.
- **Alternatives considered:** (1) URL-based source with runtime fetch — failed due to blob: worker fetch issue. (2) Main-thread fetch then pass object — also failed due to worker processing delegation. (3) Hosting GeoJSON on external CDN — unnecessary complexity, still susceptible to worker fetch issues.
- **Impact:** New file `src/data/uk-regions.json` (copy of `public/data/uk-regions.geojson`). `RegionMap.tsx` rewritten to use static import. Bundle size increases by ~45KB gzipped.
- **Files:**
  - `src/data/uk-regions.json` — NEW
  - `src/components/map/RegionMap.tsx` — MODIFIED (major rewrite: removed async fetch, added static import)
- **Status:** Active

---

### DEC-038: Cloudflare Pages for hosting
- **Date:** 22 February 2026
- **Context:** Phase 1.7 requires deploying the app to a live URL. The two main contenders were Vercel and Cloudflare Pages. Dennis already has a Cloudflare account (visible in browser tabs during development).
- **Decision:** Use Cloudflare Pages for hosting the production build. Cloudflare Pages provides free hosting with automatic HTTPS, global CDN, Git-based deployments, and easy custom domain configuration. Dennis already has an active Cloudflare account, reducing onboarding friction.
- **Reasoning:** Cloudflare Pages offers generous free tier (unlimited sites, unlimited bandwidth), built-in security headers configuration via `_headers` file, automatic HTTPS with no configuration needed, and Dennis already has an account set up. Edge network is global with strong UK presence, which matters for a UK-focused political platform.
- **Alternatives considered:** (1) Vercel — excellent DX and preview deployments, but no existing account and slightly more complex for pure static/SPA hosting. (2) Self-hosted on a VPS — unnecessary complexity for a static SPA. (3) Netlify — similar to Cloudflare Pages but Dennis has no existing relationship.
- **Impact:** Deployment will use `npm run build` → Cloudflare Pages picks up the `dist/` output directory. Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) configured in Cloudflare Pages dashboard. Security headers via `public/_headers` file.
- **Status:** Active

---

### DEC-037: Regional boards + national board pinning
- **Date:** 22 February 2026
- **Context:** The platform had only gb/national as a discussion board. Dennis requested all 12 regional boards be created and the national board pinned to the top of the board list.
- **Decision:** Added a `sort_order` integer column to the `boards` table (DEFAULT 100) to allow explicit ordering. National board set to sort_order=0 (always first), regional boards set to sort_order=10. Inserted 12 regional boards (one per region), each linked via `scope_id` to the corresponding region. BoardList UI updated to split boards into pinned national (with pin icon and highlight) and regional sections with a "REGIONAL BOARDS" divider. fetchBoards query updated to sort by `sort_order ASC, name ASC`.
- **Reasoning:** An explicit `sort_order` column is more robust than sorting by `scope_type` string comparison. It's also extensible — if we ever want to pin a regional board or reorder sections, we just change the integer. The visual distinction (blue left border, pin icon, section divider) makes it immediately obvious which board is the main national one vs regional ones.
- **Alternatives considered:** (1) Sort by `scope_type DESC` (national > region alphabetically) — fragile, depends on string ordering. (2) Add `is_pinned` boolean — less flexible than sort_order for future ordering needs. (3) Hardcode national first in frontend — bad practice, breaks if more national boards added.
- **Impact:** New migration `009_regional_boards.sql`. Updated `boardsApi.ts` (Board type + fetchBoards query). Updated `BoardList.tsx` (pinned section + regional section). New CSS styles.
- **Files:**
  - `supabase/migrations/009_regional_boards.sql` — NEW
  - `src/lib/boardsApi.ts` — MODIFIED (Board type, fetchBoards ordering)
  - `src/pages/BoardList.tsx` — MODIFIED (pinned + regional sections)
  - `src/global.css` — MODIFIED (pinned card, section divider styles)
- **Status:** Active

---

### DEC-036: Invite code rework — single-use, 8-char, trackable
- **Date:** 22 February 2026
- **Context:** The original invite code system (from Phase 1.1/1.2) used multi-use codes with `max_uses`, `times_used`, and `expires_at` columns. This was over-engineered for our needs and made the admin view cluttered. Dennis wanted a simpler, more transparent system: each code used exactly once, codes are short human-readable strings, and admins can see exactly who used each code and when.
- **Decision:** Complete rework of the invite code system. Each code is now single-use (one person, one code). Codes are 8-character uppercase alphanumeric strings generated from a 32-character alphabet that excludes ambiguous characters (no 0/O/1/I). Schema simplified: dropped `max_uses`, `times_used`, `expires_at`, `generated_by`; added `used_by` (FK to profiles), `used_at` (timestamp), `created_by` (FK to profiles). No expiry. Admin panel shows all codes with usage status, filter toggle for used/unused, "Generate 10 codes" button (super_admin only, max 50 per call). Tap-to-copy on available codes. Registration form updated: monospace input, auto-uppercase, maxLength 8.
- **Reasoning:** Single-use is simpler to reason about and audit. 8-char codes from a 32-char alphabet give ~1.1 trillion combinations — more than enough while being short enough to type. Excluding ambiguous characters (0/O/1/I) prevents transcription errors when codes are shared verbally or via screenshots. The `used_by`/`used_at` tracking gives full audit trail. The RPC batch generation function handles collisions and caps at 50 to prevent abuse.
- **Alternatives considered:** (1) Keep multi-use codes with tracking — rejected, unnecessary complexity. (2) Longer codes (12+ chars) — rejected, harder to share verbally. (3) Code expiry — rejected per Dennis's explicit preference, codes don't expire. (4) Different code alphabets (hex, base62) — rejected, the 32-char alphabet excluding ambiguous characters is the best balance of readability and uniqueness.
- **Impact:** New migration `008_invite_code_rework.sql`. All existing codes wiped (fresh start). Updated `register` Edge Function. Major rewrite of AdminPanel invite codes tab. Updated Register.tsx input. New CSS for code cards.
- **Files:**
  - `supabase/migrations/008_invite_code_rework.sql` — NEW
  - `supabase/supabase/functions/register/index.ts` — MODIFIED
  - `src/pages/AdminPanel.tsx` — MODIFIED (major rewrite of invite codes tab)
  - `src/pages/Register.tsx` — MODIFIED (code input styling)
  - `src/global.css` — MODIFIED (new code card styles)
- **Status:** Active

---

### DEC-035: Super admin RLS policy for profile updates
- **Date:** 22 February 2026
- **Context:** When a super_admin tried to change another user's role via the Admin Panel, the UI appeared to update (optimistic UI) but the change didn't persist — reloading the page showed the old role. The root cause was that the only UPDATE policy on `profiles` was `auth.uid() = id` (own row only). Supabase RLS silently blocks updates that don't match any policy (returns success with 0 rows affected, no error), so the role change was silently discarded.
- **Decision:** Add a new RLS policy "Super admins can update any profile" on the `profiles` table for UPDATE operations, using `public.is_current_user_at_least('super_admin')` in both USING and WITH CHECK clauses. Also updated the frontend `handleRoleChange` to verify the update persisted by re-fetching the row after update and reverting local state if the database role doesn't match.
- **Reasoning:** The `protect_role_column` trigger (from DEC-034) was designed to prevent unauthorized role changes, but RLS was rejecting the query before the trigger even fired. The trigger remains as a defense-in-depth measure. The frontend verification pattern (update → re-fetch → compare → revert on mismatch) prevents the optimistic UI from lying to the user if RLS or the trigger blocks the change.
- **Alternatives considered:** (1) Use service_role key from an Edge Function — rejected, adds unnecessary complexity for an admin-only operation. (2) Disable RLS for super_admins — rejected, overly broad. (3) Trust the trigger alone — doesn't work because RLS fires before triggers.
- **Impact:** New migration `007_super_admin_can_update_profiles.sql`. AdminPanel role change now has verification and revert logic.
- **Files:**
  - `supabase/migrations/007_super_admin_can_update_profiles.sql` — NEW
  - `src/pages/AdminPanel.tsx` — MODIFIED (verification logic)
- **Status:** Active

---

### DEC-034: 4-tier global role hierarchy
- **Date:** 22 February 2026
- **Context:** The platform needed a moderation system. As the community grows, Dennis alone cannot moderate all content. A role hierarchy allows delegation: regional commanders handle local boards, admins handle global moderation and invite codes, and super_admins have permanent, irrevocable authority. The original database architecture doc suggested 6 roles with scope tables, but after discussion a simpler 4-tier global approach was chosen.
- **Decision:** Add a `role` text column to `profiles` with 4 tiers: `member` (default) → `commander` (regional moderation) → `admin` (global moderation + invite code access) → `super_admin` (permanent, cannot be demoted). Roles stored as a simple text column with CHECK constraint — no separate tables needed since roles are global. Commander moderation implicitly scoped via their `region_id` matching a board's `scope_id`. Helper functions: `role_level()` maps to integers for comparison, `get_current_user_role()` returns current user's role, `is_current_user_at_least()` checks hierarchy, `get_current_user_region_id()` for commander scoping. A trigger (`protect_role_column`) prevents role changes by non-super_admins and prevents demoting super_admins.
- **Reasoning:** A text column with CHECK constraint is simpler than an enum or separate roles table, and easier to extend later. Global roles (vs. per-board/per-region) match the platform's flat hierarchy — commanders are regional by nature (their `region_id` on profiles), not by a separate scope assignment. 4 tiers (not 6) avoids unnecessary complexity at this stage. The trigger-based role protection is more robust than relying solely on RLS, since it prevents escalation even through direct SQL if the user somehow bypasses RLS.
- **Alternatives considered:** (1) Enum type instead of text + CHECK — rejected because altering enums requires migrations and is more fragile. (2) Separate roles table with many-to-many — overkill for global roles. (3) Per-board role assignments — unnecessary complexity, region scoping via profiles is sufficient. (4) 6-tier hierarchy per original docs — simplified to 4 tiers.
- **Impact:** New migration `006_role_system.sql`. Updated RLS policies on posts (3 UPDATE policies), comments (3 UPDATE policies), invite_codes (1 SELECT policy). Updated `useAuth` hook with `isAtLeast()` and `canModerateBoard()` helpers. New moderation UI: Lock/Unlock posts, Mod Delete for comments. New Admin Panel page at `/admin` with member list and invite code viewer.
- **Files:**
  - `supabase/migrations/006_role_system.sql` — NEW
  - `src/hooks/useAuth.tsx` — Role type, helpers
  - `src/lib/boardsApi.ts` — `lockPost()`, `softDeletePost()`
  - `src/components/boards/CommentItem.tsx` — Mod Delete button
  - `src/pages/PostDetail.tsx` — Lock button, mod toolbar
  - `src/components/boards/PostCard.tsx` — Lock icon
  - `src/pages/AdminPanel.tsx` — NEW
  - `src/App.tsx` — /admin route
  - `src/global.css` — Moderation, admin, lock styles
- **Status:** Active

---

### DEC-033: Reddit-style comment soft-delete with inline confirmation
- **Date:** 22 February 2026
- **Context:** Users had no way to delete their own comments. For a community forum, users need the ability to remove their own content while preserving thread integrity — exactly how Reddit handles it. Additionally, the comment UI elements (votes, timestamps, action buttons) were too small for comfortable mobile interaction.
- **Decision:** Implement Reddit-style soft-delete: clicking "Delete" on your own comment shows an inline "Delete? Yes / No" confirmation. On confirmation, the comment's `deleted_at` is set to `now()`, body is cleared to `[deleted]`, and `image_urls` is emptied. The comment row remains in the database so the threaded tree stays intact — deleted comments render as a greyed-out `[deleted]` placeholder with no body, images, or actions, but their children remain visible below. RLS policies updated to allow reading soft-deleted comments (tree integrity) and to allow authors to delete comments at any time (not subject to 15-min edit window). Comment UI elements also enlarged: body text 1rem, meta 0.9375rem, action buttons with hover backgrounds and transitions.
- **Reasoning:** Soft-delete preserves conversation context — if a parent comment is deleted, the replies below it still make sense in context. This is the Reddit standard and the right UX for threaded discussions. Inline confirmation ("Delete? Yes / No") avoids disruptive modal dialogs while still preventing accidental deletions. Enlarging the comment UI improves mobile usability — tappable action buttons with visual hover/active feedback.
- **Alternatives considered:** Hard-delete (rejected — breaks thread tree, orphans child comments), modal dialog confirmation (rejected — too heavy for a single comment action), soft-delete with body preserved but hidden (rejected — clearing body server-side is cleaner for privacy).
- **Impact:** Migration `005_comment_soft_delete_rls.sql` — updates RLS policies on `comments` table. `boardsApi.ts` — added `deleteComment()` function, updated `fetchComments()` to include `deleted_at` in select and remove the `deleted_at IS NULL` filter. `CommentItem.tsx` — rewritten with `isDeleted`/`isOwnComment` logic, inline delete confirmation UI, [deleted] placeholder rendering, larger font sizes and interactive action buttons. `PostDetail.tsx` — added `handleDeleteComment` callback passed to all CommentItem instances. `global.css` — enlarged comment typography, interactive hover styles, delete confirmation styles.
- **Status:** Active

### DEC-032: Reddit-style threaded comment tree
- **Date:** 22 February 2026
- **Context:** Comments were displayed as a flat chronological list with a "↳ Replying to @username" text indicator. This made it difficult to follow conversation threads, especially as discussions grew. The `reply_to_id` FK on the comments table already supported threading — the UI just wasn't using it.
- **Decision:** Rewrite `CommentItem.tsx` and `PostDetail.tsx` to render comments as a recursive tree. Flat comments from the API are converted client-side via a two-pass O(n) tree-building algorithm. Each reply is indented below its parent with a vertical threading line on the left. Threads are collapsible — root comments use a [−]/[+] toggle, nested comments use a clickable threading line. Visual indentation is capped at 6 levels to prevent overflow on mobile.
- **Reasoning:** Reddit-style threading is the gold standard for community discussion — it lets users follow branching conversations naturally. Client-side tree building keeps the API simple (flat chronological fetch) while giving the UI full control over presentation. The depth cap prevents deeply nested threads from becoming unreadable on small screens.
- **Alternatives considered:** Server-side tree building (rejected — adds complexity to the API for no benefit, since the flat list is already fetched in one query), flat list with reply indicators (the previous approach — rejected as insufficient for real discussions), limiting thread depth at the data level (rejected — constraining data is worse than constraining presentation).
- **Impact:** Rewrote `CommentItem.tsx` (new `CommentNode` interface, recursive rendering, collapsible state). Updated `PostDetail.tsx` (added `buildCommentTree()` function). Replaced comment CSS styles in `global.css` with threading line and indentation styles. No database or API changes needed.
- **Status:** Active

### DEC-031: Replace display_name with unique @username system
- **Date:** 21 February 2026
- **Context:** The platform used `display_name` (free-text, non-unique) for user identification. In the gb/ Boards context, users need a reliable way to identify and reference each other — like @mentions on X or Reddit. Display names don't work for this because they're not unique and not URL-safe.
- **Decision:** Replace `display_name` entirely with a `username` column: 3-20 characters, alphanumeric + underscores only, case-insensitive uniqueness enforced via `lower()` index. Usernames render as `@username` throughout the app and function as clickable links that open a slide-up profile modal. Existing accounts received placeholder usernames generated from their email prefixes.
- **Reasoning:** A unique username is the foundation for @mentions, profile linking, and community identity. Case-insensitive uniqueness prevents confusion (e.g., `JohnSmith` vs `johnsmith`). The `@username` convention is universally understood from X/Twitter. Replacing `display_name` rather than adding alongside it avoids confusion about which name to show where.
- **Alternatives considered:** Adding username alongside display_name (rejected — two name fields causes confusion about which to show), using email as identifier (rejected — privacy concern, not user-friendly), UUID-based profile links without usernames (rejected — no human-readable identity).
- **Impact:** Migration `004_username_replaces_display_name.sql` — adds `username` column, drops `display_name`, updates `handle_new_user()` trigger. All frontend components updated: boardsApi.ts, PostCard, CommentItem, PostDetail, BoardView, Dashboard, Profile, Register. New `UserProfileModal.tsx` component. Edge Function `register/index.ts` updated. CSS additions for `.username-link` and `.user-profile-*` styles.
- **Status:** Active

### DEC-030: All boards visible to all verified members for MVP
- **Date:** 21 February 2026
- **Context:** gb/ Boards will eventually have regional boards (gb/west-midlands, gb/scotland, etc.) scoped so only members of that region can see them. For MVP with <50 users, this adds friction without value.
- **Decision:** All boards are visible to all verified members regardless of region. Regional board scoping deferred to Goal 2.
- **Reasoning:** With a small user base, restricting visibility fragments an already small community. Better to let everyone see everything and build momentum. Scoping can be layered on later via RLS policy updates without schema changes.
- **Alternatives considered:** Region-scoped from day one (rejected — fragments tiny community), hybrid with national visible + regional scoped (rejected — unnecessary complexity for MVP).
- **Impact:** RLS policies on `posts` and `comments` use `is_current_user_verified()` only, no scope check. When regional scoping is added, policies get an additional `board.scope_id` check.
- **Status:** Active

### DEC-029: Hot sort uses last_comment_at for MVP (no decay algorithm)
- **Date:** 21 February 2026
- **Context:** Reddit-style "Hot" sorting uses a decay function (Wilson score, Hacker News algorithm) to rank content by a combination of votes, comments, and recency. For MVP with <100 posts, this is over-engineered.
- **Decision:** Hot sort = `ORDER BY last_comment_at DESC NULLS LAST`, with pinned posts first. Posts with recent comments rise naturally.
- **Reasoning:** At low volume, activity-based sorting is functionally equivalent to decay-based ranking. Zero computation cost. Upgrade path is clean: add a `hot_score` column maintained by a scheduled Postgres function when post volume warrants it.
- **Alternatives considered:** Wilson score (rejected — overkill at this scale), Hacker News gravity formula (rejected — same), no Hot sort / just New + Top (rejected — loses the "active discussion" signal).
- **Impact:** No additional columns or functions needed. Just an `ORDER BY` clause on the existing `last_comment_at` field.
- **Status:** Active

### DEC-028: Client-side image processing (resize, EXIF strip, compress)
- **Date:** 21 February 2026
- **Context:** gb/ Boards allows image uploads on posts and comments. Images need to be reasonably sized (not raw 12MP phone photos) and stripped of EXIF data (which contains GPS coordinates and device info — privacy risk).
- **Decision:** All image processing happens client-side in the browser before upload. Canvas API resizes to max 1200px on longest side, re-exports as JPEG at 80% quality. Canvas re-export naturally strips EXIF metadata. No server-side image pipeline.
- **Reasoning:** Browser Canvas API handles resize, compression, and EXIF stripping natively — no external dependencies, no server infrastructure. Keeps images under 5MB. EXIF stripping is a critical privacy feature: users posting from phones would otherwise leak GPS coordinates, device model, and timestamps.
- **Alternatives considered:** Server-side processing with Sharp/ImageMagick (rejected — requires server infrastructure, adds latency), Supabase Edge Function for processing (rejected — Edge Functions have size limits and no Canvas API), accept raw uploads (rejected — storage cost, bandwidth, EXIF privacy leak).
- **Impact:** New component `ImageUploader.tsx`. Max upload size 5MB per image. Supabase Storage bucket `board-images`.
- **Status:** Active

### DEC-027: Flat comments with reply_to hint (not full nesting)
- **Date:** 21 February 2026
- **Context:** Comments on posts need some form of threading so users can respond to specific comments, not just the post. Full Reddit-style nested comment trees are complex to render and navigate on mobile.
- **Decision:** Flat comment list sorted chronologically, with an optional `reply_to_id` field. When set, the comment displays a "↳ Replying to {name}" indicator above it. No indentation, no recursive tree rendering.
- **Reasoning:** Full nesting creates deep indentation that's unusable on mobile screens. Flat + reply-to gives 80% of the threading value with 20% of the complexity. The data model supports upgrade to full nesting later — `reply_to_id` is already a self-referencing FK. UI just needs a tree renderer.
- **Alternatives considered:** Full nested threading (rejected — mobile UX nightmare, complex rendering), purely flat with no reply context (rejected — loses conversational flow), collapsible nested threads (rejected — too complex for MVP).
- **Impact:** `comments` table has `reply_to_id` column (nullable FK to self). `CommentItem.tsx` shows reply-to indicator. No recursive queries needed — single flat query with optional join for reply-to author name.
- **Status:** Active

### DEC-026: Single upvote/downvote system (not multi-reaction)
- **Date:** 21 February 2026
- **Context:** The original database architecture doc specified a `reactions` table with three types: like, support, fire. For gb/ Boards, we need a system that directly feeds the sorting algorithm.
- **Decision:** Replace multi-reaction with a single upvote/downvote vote per user per target. `votes` table with `value` of +1 or -1. Net `upvote_count` cached on posts and comments via trigger.
- **Reasoning:** Upvote/downvote is simpler, more familiar (Reddit model), and directly feeds the Top sort algorithm. Multi-reaction (like/support/fire) adds UI complexity and doesn't map cleanly to a single ranking score. One vote per target is enforceable via unique constraint.
- **Alternatives considered:** Multi-reaction as originally designed (rejected — doesn't feed sorting, adds complexity), upvote only / no downvote (rejected — loses the signal of community disagreement, which is valuable for a political platform), no voting system (rejected — no way to surface quality content).
- **Impact:** New `votes` table replaces planned `reactions` table. `VoteButton.tsx` component. Trigger maintains `upvote_count` on posts and comments. `database-architecture.md` to be updated to reflect this change.
- **Status:** Active

### DEC-025: Replace Telegram architecture with in-app gb/ Boards
- **Date:** 21 February 2026
- **Context:** Phase 1.6 was originally designed around creating and managing Telegram groups as the community communication layer. This creates a fragmented experience where users bounce between the app and Telegram, and gives Restore Britain no ownership of the discussion data.
- **Decision:** Replace the entire Telegram group architecture with an in-app forum system branded "gb/ Boards." Community discussion lives entirely within the app. Telegram and X are recommended for private messaging but not integrated. The "Join Telegram Group" button on the region bottom sheet is replaced with a board link.
- **Reasoning:** Keeping discussion in-app means: owning the data, controlling the experience, enforcing membership gating at the content level (not just the group invite level), and building a distinctive community identity with the `gb/` namespace. Telegram groups are impossible to moderate at scale and fragment the user journey.
- **Alternatives considered:** Telegram groups as originally planned (rejected — fragmented experience, no data ownership, moderation nightmare), Discord server (rejected — same fragmentation, younger demographic association), Matrix/Element (rejected — technical barrier for non-technical members).
- **Impact:** Phase 1.6 fully rewritten. New tables: `boards`, `posts`, `comments`, `votes`. New storage bucket. ~12 new frontend components/pages. `RegionBottomSheet` updated to remove Telegram references. DEC-002 ("Delegate all messaging to Telegram") is superseded for community discussion, retained only for private messaging recommendation.
- **Status:** Active — supersedes DEC-002 for community discussion

### DEC-024: Database trigger for regions.member_count maintenance
- **Date:** 21 February 2026
- **Context:** The bottom sheet displays `member_count` for each region. This value needs to stay accurate as users are assigned to regions during onboarding or change regions later.
- **Decision:** Use a PostgreSQL `BEFORE INSERT OR UPDATE` trigger on the `profiles` table that automatically increments/decrements `regions.member_count` whenever a profile's `region_id` changes. Decrements clamped to 0 to prevent negative counts. SQL saved in `supabase/migrations/002_member_count_trigger.sql`.
- **Reasoning:** member_count is read on every bottom-sheet open (high read frequency) but only changes when a user onboards or changes region (low write frequency). A pre-computed integer with trigger maintenance is far cheaper than a `COUNT(*)` query on every read. The trigger is `SECURITY DEFINER` with `search_path = public` to avoid RLS interference.
- **Alternatives considered:** `COUNT(*)` view or RPC (rejected — unnecessary read overhead on every bottom-sheet open), client-side count (rejected — inaccurate, requires loading all profiles), scheduled batch update (rejected — stale data between runs).
- **Impact:** `supabase/migrations/002_member_count_trigger.sql` — Dennis to run in Supabase SQL Editor. A one-time reconciliation query is included in comments for any existing data.
- **Status:** Active — pending Dennis running the migration.

### DEC-023: Postcode-to-region onboarding flow with ProtectedRoute gate
- **Date:** 21 February 2026
- **Context:** After registration, users need to be assigned to a region. Phase 1.5 requires a mechanism to collect the user's location and map them to one of the 12 regions.
- **Decision:** Build a standalone onboarding page (`/onboarding`) that collects the user's UK postcode, extracts the 1-2 letter area prefix, maps it to a region via a client-side lookup table (124 mappings), and stores both `postcode_area` and `region_id` on the profile. `ProtectedRoute` redirects users with no `region_id` to this page. Users can skip onboarding and select a region from the map later.
- **Reasoning:** Postcodes are the simplest location input for UK users — everyone knows theirs. The area prefix (first 1-2 letters) maps cleanly to the 12 regions with no ambiguity for 99%+ of cases. Client-side lookup avoids a network request and works offline. The skip option ensures no user is permanently blocked from accessing the app.
- **Alternatives considered:** Geolocation API (rejected — requires permission prompt, fails indoors, overkill for 12 regions), dropdown region picker (rejected — less engaging, users may not know their ONS region name), full postcode lookup API (rejected — external dependency, cost, unnecessary precision for regional assignment).
- **Impact:** New files: `src/pages/Onboarding.tsx`, `src/lib/postcodeRegions.ts`. Modified: `src/components/ProtectedRoute.tsx` (added region_id check), `src/App.tsx` (added /onboarding route).
- **Status:** Active

### DEC-022: Bottom sheet for region detail view (CSS transform animation)
- **Date:** 21 February 2026
- **Context:** Phase 1.5 requires a region detail panel that appears when a user taps a region on the map. The panel needs to show region info, member count, and a Telegram group link.
- **Decision:** Build a bottom-sheet component (`RegionBottomSheet`) that slides up from the bottom of the viewport using CSS `transform: translateY()` animation. Dismissible via swipe-down gesture (touch event tracking with 80px threshold) or tapping the semi-transparent overlay behind it. Data fetched from Supabase `regions` table by mapping feature IDs to region names.
- **Reasoning:** Bottom sheets are the standard mobile pattern for contextual detail — familiar to users, doesn't obscure the entire map, allows easy dismissal. CSS transform animation is GPU-accelerated and 60fps. Swipe-to-dismiss is the natural gesture on mobile. Feature ID to region name mapping is done client-side since we have a static list of 12 regions.
- **Alternatives considered:** Full-page overlay (rejected — hides the map entirely, breaks spatial context), side panel (rejected — too narrow on mobile), modal dialog (rejected — feels desktop-centric, not the right pattern for map interaction).
- **Impact:** New files: `src/components/map/RegionBottomSheet.tsx`. Modified: `src/pages/MapView.tsx` (manages selectedRegionId state), `src/components/map/RegionMap.tsx` (added onBackgroundClick prop), `src/global.css` (bottom sheet styles).
- **Status:** Active

### DEC-021: Placeholder logo and navy primary colour
- **Date:** 20 February 2026
- **Context:** Official brand assets have not yet been received from Restore Britain. Dennis created a placeholder logo — a white UK silhouette on a navy blue background — to use in the interim.
- **Decision:** Adopt the placeholder logo for all icon sizes (favicon, 192px, 512px PWA icons) and the app header. Extract the navy blue (`#051e40`) from the logo as the primary brand colour across the entire app — header, PWA theme, links, active tab indicators. This replaces the previous generic blue (`#2563eb`).
- **Reasoning:** Having a recognisable identity, even a placeholder one, makes the app feel more cohesive than generic blue. The navy is dark, professional, and carries authority. When official assets arrive (Phase 1.8), we swap the images and update the CSS custom properties — the architecture is already in place.
- **Alternatives considered:** Wait for official assets (rejected — delays the visual identity indefinitely), use a different colour from the logo (rejected — the navy is the only real colour and it works well).
- **Impact:** `global.css` (`--colour-primary`), `manifest.json`, `index.html` theme-color meta, `brand/theme.json`, all icon files, `AppShell.tsx` header logo. Service worker cache bumped to `rb-v3`.
- **Status:** Active — will be superseded by Phase 1.8 when official assets arrive.

### DEC-020: Remove Shetland and Orkney from map GeoJSON
- **Date:** 20 February 2026
- **Context:** The Scotland GeoJSON feature included 120 polygon parts spanning from mainland Scotland up to Shetland at 60.8°N. On mobile viewports, this pulled the map's centre of gravity far north-east, leaving the map poorly framed with too much empty sea visible. The distant island clusters were disproportionately affecting the viewport for a feature (regional overview) where they add no value.
- **Decision:** Remove all Scotland polygon parts where the minimum latitude exceeds 58.75°N. This cuts 37 polygons (Shetland and Orkney) while preserving the entire mainland (which peaks at 58.67°N) and the Hebrides / western islands. UK_BOUNDS updated to `[1.8, 59.2]` NE corner, MAX_BOUNDS tightened to `[3, 60]`.
- **Reasoning:** The map exists to let users identify and select their region. Shetland and Orkney are visually insignificant at the zoom levels we support (min 4.5) and Scotland remains a single selectable region regardless. Removing them dramatically improves map framing on mobile.
- **Alternatives considered:** Inset map for Shetland/Orkney (rejected — complex UI for no user value at MVP), keeping them and adjusting bounds manually (rejected — the scatter of tiny islands still distorts fitBounds calculations), moving them closer to mainland as a cartographic convention (rejected — misleading).
- **Impact:** `public/data/uk-regions.geojson` (Scotland reduced from 120 to 83 polygons, file size reduced from 172KB to 162KB), `RegionMap.tsx` (UK_BOUNDS and MAX_BOUNDS updated).
- **Status:** Active

### DEC-019: Pre-blended opaque fills to eliminate MapLibre diagonal line artefacts
- **Date:** 21 February 2026
- **Context:** Diagonal lines appeared across filled polygon regions (most visible on Scotland and Wales). This is a known, long-standing issue in MapLibre/Mapbox GL JS (tracked in mapbox/mapbox-gl-js#7023). Root cause: with `fill-opacity < 1.0`, WebGL alpha-composites each individual triangle from earcut triangulation. Where triangles share edges or overlap by sub-pixel amounts (GPU floating-point rounding), alpha is applied twice, creating a visible darker seam. Disabling `fill-antialias` alone did not fix it — the artefact is fundamentally an alpha compositing problem, not an antialiasing one.
- **Decision:** Pre-blend all region colours with the sea background (`#dbe9f4`) to produce solid RGB values that look identical to the original semi-transparent colours, then render at `fill-opacity: 1.0`. Formula: `solid = originalColour × 0.85 + seaColour × 0.15`. Also keep `fill-antialias: false` as belt-and-braces.
- **Reasoning:** With fully opaque fills, there is zero alpha compositing — triangle seams cannot produce visible artefacts regardless of geometry complexity. The pre-blended colours are mathematically equivalent, so the visual result is identical. No external dependencies, no runtime overhead, no GeoJSON changes.
- **Alternatives considered:** `fill-antialias: false` alone (tried — did not fix it), winding order correction (tried — did not fix it), reducing polygon complexity (would lose coastline detail), using a tile provider with pre-rendered fills (adds dependency and network requests).
- **Impact:** `regionColours.ts` — all colour values updated to pre-blended equivalents. `RegionMap.tsx` — `fill-opacity: 1.0` and `fill-antialias: false` on both fill layers. Verified artefact-free on iPhone.
- **Status:** Active

### DEC-018: GeoJSON winding order fix for MapLibre rendering
- **Date:** 20 February 2026
- **Context:** After implementing the interactive map, diagonal line artifacts appeared across Scotland, Wales, and other complex polygon regions. Investigation revealed all 174 polygon rings in the GeoJSON file had incorrect winding order — outer rings were clockwise (CW) instead of counter-clockwise (CCW), violating the RFC 7946 GeoJSON specification. MapLibre's earcut triangulation algorithm assumes correct winding and produces degenerate triangles when rings are reversed, creating visible diagonal edge artifacts.
- **Decision:** Fix the GeoJSON data in-place using a Python script that applies the shoelace formula to detect winding direction and reverses any incorrectly wound rings. Outer rings set to CCW, inner rings (holes) set to CW, per RFC 7946. Also cleaned 3 duplicate consecutive vertices found during analysis.
- **Reasoning:** The root cause was in the source data, not the rendering code. The ONS boundary data and the Douglas-Peucker simplification both preserved the original (incorrect) winding order. Fixing the data once is cleaner than adding a runtime rewind step in the rendering pipeline.
- **Alternatives considered:** Runtime rewind using `@mapbox/geojson-rewind` npm package (rejected — adds a dependency for a one-time data issue), ignoring the artifacts (rejected — visually distracting, especially on Scotland with 120 polygon parts), re-downloading source data (wouldn't help — ONS data has the same winding issue).
- **Impact:** `public/data/uk-regions.geojson` updated. All 12 features now RFC 7946 compliant. No code changes needed — the fix is purely in the data file. File size unchanged at ~172 KB.
- **Status:** Active

### DEC-017: Defer "Find My Region" geolocation to later phase
- **Date:** 20 February 2026
- **Context:** The initial Phase 1.4 plan included a "Find My Region" button that uses the Geolocation API to auto-detect the user's region via point-in-polygon testing. After building it, the decision was made to remove it from the MVP and defer it.
- **Decision:** Remove the FindMyRegionButton component and point-in-polygon utility from the active codebase. Users select their region manually by tapping the map. Geolocation auto-select may be revisited when constituency-level detail is added in a later phase.
- **Reasoning:** For an MVP with only 12 large regions, manual selection is trivially easy — users know which region they're in. The geolocation button adds UI clutter and complexity (permission prompts, error handling for denied/unavailable location) that isn't justified at this scale. It becomes more valuable when the map shows 650 constituencies and users genuinely need help finding their local area.
- **Alternatives considered:** Keeping the button but making it less prominent (rejected — still adds complexity for marginal value), moving it to the profile/onboarding flow instead of the map (rejected — same complexity, different location).
- **Impact:** `FindMyRegionButton.tsx` and `pointInPolygon.ts` are dead code to be deleted. DEC-016 (point-in-polygon algorithm choice) is deferred alongside this decision. No runtime impact — the button was already removed from the component tree.
- **Status:** Active

### DEC-016: Custom ray-casting point-in-polygon instead of Turf.js
- **Date:** 20 February 2026
- **Context:** The "Find My Region" geolocation feature needs to determine which of the 12 regions contains the user's coordinates. This requires a point-in-polygon test.
- **Decision:** Implement a custom ray-casting algorithm (~30 lines of TypeScript) that handles both Polygon and MultiPolygon geometries, including polygon holes. No external dependency.
- **Reasoning:** Turf.js `@turf/boolean-point-in-polygon` would add ~50 KB gzipped for a single function we can write in 30 lines. The ray-casting algorithm is well-understood, mathematically simple, and our implementation handles all the GeoJSON geometry types we need (Polygon, MultiPolygon, rings with holes). Zero maintenance burden from an external dependency for a trivial algorithm.
- **Alternatives considered:** Turf.js (rejected — disproportionate dependency size for one function), server-side lookup via Supabase RPC (rejected — adds latency and requires network, defeats offline capability), postcode-to-region lookup table (rejected — less accurate than actual polygon containment, doesn't work for users who haven't entered a postcode yet).
- **Impact:** `src/components/map/pointInPolygon.ts` is a standalone utility with no dependencies. Can be unit tested independently. Used by FindMyRegionButton.
- **Status:** Deferred — see DEC-017. Code exists but is not imported or used. Will be revisited if geolocation is re-added in a later phase.

### DEC-015: Tile-free map using MapLibre GL JS with GeoJSON on plain background
- **Date:** 20 February 2026
- **Context:** The interactive map needs to display 12 UK regions as coloured polygons. A traditional tile-based map (OpenStreetMap, Mapbox, etc.) would add visual noise (roads, labels, terrain) that distracts from the regional boundaries, requires a tile provider API key, and creates an external runtime dependency.
- **Decision:** Use MapLibre GL JS with a completely custom style: a solid sea-blue background colour (`#dbe9f4`) with GeoJSON polygons rendered directly on top. No tile provider. The GeoJSON data is a static file (`public/data/uk-regions.geojson`, 172 KB) precached by the service worker for offline use. Boundary data sourced from the ONS Open Geography Portal (December 2024 boundaries), simplified using Douglas-Peucker algorithm to match BUC (Ultra Generalised Clipped) vertex density.
- **Reasoning:** A tile-free map is faster to load (no tile requests), works fully offline, looks cleaner for a choropleth-style regional map, and has zero ongoing API costs. MapLibre provides all the interaction features we need (pinch-to-zoom, pan with inertia, click events, flyTo animations) without any tile provider dependency. The 172 KB GeoJSON file is smaller than a single tile response.
- **Alternatives considered:** OpenStreetMap tiles via MapLibre (rejected — visual noise, external dependency, API costs at scale), Leaflet.js (rejected — SVG rendering is less performant than MapLibre's WebGL for complex polygons), D3.js (rejected — no built-in pinch-to-zoom/pan, would need to build all interaction from scratch), static SVG image (rejected — no zoom/pan interaction).
- **Impact:** MapLibre GL JS added as only new dependency (~400 KB gzipped). Map works fully offline after first load. No external API keys or tile provider accounts needed. Region colours and styles are placeholder neutrals pending brand integration in Phase 1.8.
- **Status:** Active

### DEC-014: Atomic registration via single Edge Function
- **Date:** 20 February 2026
- **Context:** User registration involves multiple steps — validating the invite code, creating the auth user, populating the profile, and incrementing the invite code usage counter. If any step fails partway through, data can be left in an inconsistent state (e.g., auth user created but no profile, or invite code not decremented).
- **Decision:** Handle the entire registration flow in a single Supabase Edge Function (`register`) that runs server-side with the service role key. The function validates the invite code, creates the user via the Admin API (with `email_confirm: true` to bypass email verification for MVP), updates the profile, and increments invite code usage — all in one request. If any step fails, earlier steps are rolled back manually within the function.
- **Reasoning:** A single atomic function eliminates race conditions and partial-failure states. It also keeps the service role key server-side (never exposed to the client) and centralises all registration logic in one auditable place.
- **Alternatives considered:** Client-side multi-step registration calling Supabase directly (rejected — exposes service role key or requires multiple RLS policy workarounds, and partial failures leave orphaned data). Database-level transaction via RPC function (rejected — Supabase Auth user creation can't be done inside a PostgreSQL transaction, it requires the Admin API).
- **Impact:** Registration page calls a single Edge Function endpoint. All invite code validation and user creation logic lives server-side. Client only needs the anon key.
- **Status:** Active

### DEC-013: Frontend project initialisation pulled forward to Phase 1.2
- **Date:** 20 February 2026
- **Context:** Phase 1.2 (Auth & Membership Gating) requires a working frontend to build the login/registration UI, but the original plan had frontend initialisation in Phase 1.3 (PWA Shell).
- **Decision:** Pull the Vite + React + TypeScript project initialisation into Phase 1.2 so that auth UI work can begin immediately. Phase 1.3 then focuses purely on PWA features (manifest, service worker, app shell layout) rather than project scaffolding.
- **Reasoning:** Auth UI can't be built without a frontend project. Keeping project init in Phase 1.3 would mean Phase 1.2 has no way to create the registration and login pages. The dependency is obvious — the frontend must exist before any UI work can happen.
- **Alternatives considered:** Building auth as a purely backend/API phase with no UI (rejected — testing auth without a UI is possible but slower and less useful for validating the real user flow).
- **Impact:** Phase 1.2 now includes `npm create vite`, dependency installation, and Supabase client setup. Phase 1.3 scope reduced to PWA-specific work only.
- **Status:** Active

### DEC-012: GitHub as remote repository host
- **Date:** 20 February 2026
- **Context:** The project needs a remote Git repository for backup, collaboration, and future CI/CD integration.
- **Decision:** Host the private repository on GitHub at `github.com/DennisHStevens/restore-britain-app`.
- **Reasoning:** GitHub has the larger ecosystem, better integration with Vercel (our likely hosting choice for deployment in Phase 1.7), and GitHub Actions for CI/CD when we need it. Dennis already had a GitHub account set up.
- **Alternatives considered:** GitLab (rejected — no specific advantage for this project, and Vercel integration is stronger with GitHub).
- **Impact:** All pushes go to GitHub. Future CI/CD pipelines will use GitHub Actions. Deployment in Phase 1.7 can connect directly to the GitHub repo.
- **Status:** Active

### DEC-011: Git version control initialised before any development work
- **Date:** 20 February 2026
- **Context:** Development work was about to begin without version control in place, risking loss of work and inability to track changes.
- **Decision:** Git repository initialised as the very first task in Phase 1.1 — before Supabase setup, before any code. Every phase ends with a commit and push. Remote repository hosted on GitHub or GitLab (private).
- **Reasoning:** Version control is non-negotiable infrastructure. Without it, any failure (accidental deletion, bad code, corrupted files) is unrecoverable. Committing at the end of each phase creates natural checkpoints to roll back to.
- **Alternatives considered:** Starting Git later after initial setup (rejected — even one day of unversioned work is an unnecessary risk).
- **Impact:** Every phase in the goals checklist now ends with a commit-and-push task. `.gitignore` configured before any secrets exist in the project.
- **Status:** Active

### DEC-010: Brand and design to align with existing Restore Britain identity
- **Date:** 20 February 2026
- **Context:** The platform needs a visual identity — colours, logos, fonts, map styling.
- **Decision:** Rather than creating a new brand, the platform will adopt Restore Britain's existing brand guidelines — same colours, logos, and fonts. Brand assets will be stored in a dedicated folder within the project rather than requiring a separate design document.
- **Reasoning:** Consistency with the party's existing identity is more important than a bespoke design. Members should recognise the platform as an official Restore Britain tool immediately. Avoids unnecessary design work.
- **Alternatives considered:** Creating a distinct platform brand (rejected — fragmentation), hiring a designer for a custom identity (rejected — unnecessary cost and delay at this stage).
- **Impact:** Frontend colour palette, typography, logo placement, and map styling all derive from existing party assets. Need to source official brand files from Restore Britain.
- **Status:** Active

### DEC-009: Create a soul.md file for Claude Code / Cowork agent
- **Date:** 20 February 2026
- **Context:** AI-assisted development tools produce better output when given explicit standards and working principles upfront.
- **Decision:** Create a concise soul.md file that defines working standards, response expectations, and values (candour, honesty, thoroughness over shortcuts) for any AI agent working on this project.
- **Reasoning:** Prevents repeated course-correction during development. Sets a consistent quality bar across sessions. Saves hours over the project lifecycle.
- **Alternatives considered:** No soul file, just correct as we go (rejected — inefficient and inconsistent).
- **Impact:** All AI-assisted development work on this project should reference soul.md.
- **Status:** Pending creation

### DEC-008: Maintain a decisions log
- **Date:** 20 February 2026
- **Context:** Multiple significant architectural decisions were being made across a single conversation with no persistent record of the reasoning behind them.
- **Decision:** Create and maintain a DECISIONS.md file logging every significant decision with context, reasoning, and alternatives.
- **Reasoning:** Prevents relitigating settled questions. Provides clarity when returning to the project after a break. Creates accountability for why things are built the way they are.
- **Alternatives considered:** Relying on conversation history (rejected — hard to search, easy to lose context).
- **Impact:** All future decisions should be logged here before implementation.
- **Status:** Active

### DEC-007: Create a goals/checklist file with phased micro-targets
- **Date:** 20 February 2026
- **Context:** The three existing documents (overview, security, database) describe what we're building but not a trackable plan for getting there.
- **Decision:** Create a goals and checklist MD file with an overarching goal, broken into phased micro-goals and a running task list of completed and pending items.
- **Reasoning:** Operational backbone needed to track progress. Without it, the project is a description, not a plan.
- **Alternatives considered:** Tracking tasks informally (rejected — doesn't scale, loses accountability).
- **Impact:** All development work should be tracked against this file. Phase 1 to be defined collaboratively.
- **Status:** Pending creation

### DEC-006: Online Operations and International Outreach as non-geographic departments
- **Date:** 20 February 2026
- **Context:** Not all political organising is tied to physical geography. Digital campaigns, social media coordination, and international relationship-building need a home in the platform.
- **Decision:** Create a "departments" system that functions identically to regions (leaders, quests, forums, Telegram groups) but is not tied to the map. Initial departments: Online Operations, International Outreach (with European Networks and US Relations sub-departments).
- **Reasoning:** Captures digital and international activity within the same quest/gamification framework. Any member can join regardless of location. Keeps the platform relevant for members whose primary contribution is online.
- **Alternatives considered:** Bundling online ops into the national tier (rejected — too vague, no dedicated leadership), separate platform for international work (rejected — fragmentation).
- **Impact:** Departments table in database, department navigation in the UI, department-scoped quests and forums.
- **Status:** Active

### DEC-005: Optional X (Twitter) account linking on member profiles
- **Date:** 20 February 2026
- **Context:** Members may want to connect their X presence to their platform identity for networking and credibility.
- **Decision:** Add an optional X handle field to member profiles. V1 implementation is a simple text field with a link out; verified OAuth linking can be added later.
- **Reasoning:** Low implementation cost, adds social proof and networking value. Optional so it doesn't block registration.
- **Alternatives considered:** OAuth-verified linking from day one (rejected for v1 — adds complexity), no social linking at all (rejected — useful for networking and the online operations department).
- **Impact:** One field on the profiles table. Display on member profile UI with link to X profile.
- **Status:** Active

### DEC-004: National → Regional → Local progression (not 650 constituencies at launch)
- **Date:** 20 February 2026
- **Context:** With realistic early membership numbers (hundreds to low thousands), 650 constituencies would result in most being empty. An empty map undermines confidence and momentum.
- **Decision:** Launch with ~12 regions as the primary organisational unit. Constituencies exist in the database but are not exposed to users. They unlock when regional membership density reaches a threshold — potentially gamified as a recruitment incentive.
- **Reasoning:** 12 regions with even 500 total members means ~40 per region — enough to feel active. 650 constituencies with 2,000 members means ~3 per constituency — feels dead. The map should always feel alive.
- **Alternatives considered:** Launching with all 650 constituencies (rejected — too sparse), launching with only a national tier (rejected — loses the geographic organising power).
- **Impact:** Map shows regions at launch, not constituencies. Database schema pre-built for constituencies. Phased delivery adjusted. Constituency unlock becomes a future feature/gamification element.
- **Status:** Active

### DEC-003: Membership gating — platform restricted to verified Restore Britain members only
- **Date:** 20 February 2026
- **Context:** The platform is an internal organising tool, not a public recruitment site. Open access would invite trolls, infiltrators, and noise.
- **Decision:** Registration requires verified Restore Britain party membership via membership ID + email verification against an authorised list, or via single-use invite codes generated by leaders. No public access whatsoever — even browsing requires authentication.
- **Reasoning:** Keeps the community trusted and focused. Invite codes create accountability chains. Prevents hostile actors from easily accessing campaign planning data.
- **Alternatives considered:** Public access with private areas (rejected — too much surface area), email-only verification (rejected — too weak), manual approval for every registration (rejected — doesn't scale).
- **Impact:** Membership verification table in database, gated registration flow, invite code system, RLS policies tied to is_verified flag.
- **Status:** Active

### DEC-002: Delegate all messaging to Telegram (no custom messaging system)
- **Date:** 20 February 2026
- **Context:** Building end-to-end encrypted messaging, group chat with key rotation, real-time delivery, and offline queuing would be the single most complex and time-consuming component of the platform — months of work producing something inferior to existing solutions.
- **Decision:** All private and group messaging happens on Telegram. The platform provides structured links to Telegram groups at national, regional, departmental, and quest levels. Optional Telegram bot integration pulls activity metrics (not message content) back into the platform.
- **Reasoning:** Telegram already solves messaging at scale with mature security, mobile apps everyone knows, and zero maintenance burden on us. Frees us to focus on what's actually unique — the map, quest system, gamification, and digital parliament structure. Dramatically reduces security scope (no encryption key management, no message storage).
- **Alternatives considered:** Building custom E2E encrypted messaging with libsodium (rejected — massive scope, months of work, ongoing maintenance), using Matrix/Element as self-hosted alternative (rejected — operational complexity of running a Matrix server), using Signal (rejected — no bot API, poor group management features), using Discord (rejected — association with gaming, less credible for political organising).
- **Impact:** Entire messaging layer removed from our build scope. Security document simplified (no E2E encryption to implement). Database schema simplified. Telegram becomes an external dependency with documented fallback plan.
- **Status:** Active

### DEC-001: Drop VPN / censorship resistance infrastructure
- **Date:** 20 February 2026
- **Context:** Initial plan included building or providing a VPN service for all members to ensure the platform couldn't be blocked by UK ISPs, potentially hosted on US east coast servers.
- **Decision:** Drop the VPN entirely. Host the platform on US-based infrastructure (Vercel/Cloudflare) for jurisdictional benefit, but do not provide VPN services to members.
- **Reasoning:** Providing a VPN service means becoming a network infrastructure provider — bringing legal obligations, significant ongoing costs, bandwidth management, and liability. The actual goal (being hard to block) is better achieved by hosting outside UK jurisdiction with alternative domain capability as a quiet contingency. Additionally, heavy censorship resistance infrastructure signals "we have something to hide" when the movement is organising lawful political activity and should signal legitimacy.
- **Alternatives considered:** Full VPN service for all members (rejected — disproportionate scope, cost, and legal complexity), Tor hidden service (rejected — association with illicit activity, poor performance, counterproductive optics), IPFS hosting (rejected — immature for dynamic web apps).
- **Impact:** No VPN infrastructure to build or maintain. Hosting decisions simplified. Security document focused on application-level protections rather than network-level anonymity.
- **Status:** Active

---

## Superseded Decisions

*None yet. When a decision is overturned or replaced, it moves here with a note pointing to the new decision that superseded it.*

---

## How to Use This Document

1. **Before making a new decision**, check if it's already been decided here.
2. **When a decision is made**, add a new entry at the top of the Active Decisions section with the next sequential DEC number.
3. **If a decision is overturned**, move it to the Superseded section and add a note explaining what replaced it and why.
4. **During development**, reference this document when you encounter a "why did we do it this way?" question.

---

*Document version: 0.5 — Added DEC-022 (bottom sheet), DEC-023 (postcode onboarding), DEC-024 (member_count trigger)*
*Last updated: February 2026*
*Author: Dennis Stevens & Claude (AI-assisted)*
