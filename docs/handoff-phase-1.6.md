# Phase 1.6 Handoff: gb/ Boards Implementation

## What You Are

You are picking up development of the Restore Britain app — a members-only political organising PWA. Phases 1.1–1.5 are complete (auth, PWA shell, interactive map, region detail, onboarding, profiles). You are implementing Phase 1.6: an in-app community forum system called "gb/ Boards."

## Before You Write Any Code

Read these files in this order. Do not skip any of them.

1. `CLAUDE.md` — Working standards, the Tortoise Principle, documentation discipline, code standards. This governs how you work.
2. `docs/phase-1.6-gb-boards.md` — **The complete design document for what you're building.** Schema, RLS policies, indexes, triggers, storage bucket, frontend architecture, component specs, implementation order, sorting algorithms, image upload flow, vote flow. Everything is specified here. Follow it precisely.
3. `docs/goals-checklist.md` — Find Phase 1.6. Every task is listed with checkboxes. Work through them in order. Mark each task with `✅ Completed: DD MMM YYYY, HH:MM` when done.
4. `docs/decisions-log.md` — DEC-025 through DEC-030 cover all architectural decisions for this phase. They're already logged. Don't re-decide things that are settled.
5. `docs/database-architecture.md` — The original schema design. Phase 1.6 adapts it (e.g., `boards` replaces `forum_categories`, `votes` replaces `reactions`). The design doc takes precedence where they differ.
6. `docs/security-encryption-architecture.md` — Security posture. RLS is the enforcement boundary. No secrets in frontend. Service role key is Edge Functions only.

## The Existing Codebase

**Stack:** Vite + React + TypeScript + Supabase (PostgreSQL + Auth + Storage). No Tailwind — uses CSS custom properties in `src/global.css`. No component library — everything is hand-built.

**Key patterns to match:**
- `src/hooks/useAuth.tsx` — Shared auth state via React Context. Call `useAuth()` to get `session`, `user`, `profile`, `loading`, `refreshProfile`. Never create independent auth state.
- `src/lib/supabase.ts` — Single Supabase client instance. All queries go through this. Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/lib/postcodeRegions.ts` — Example of a utility module pattern.
- `src/components/layout/AppShell.tsx` — The app frame: header + scrollable content + bottom nav. You'll add a third "Boards" tab here.
- `src/components/ProtectedRoute.tsx` — Auth gate. All board routes go inside this.
- `src/App.tsx` — Routing. Add new routes here.
- `src/pages/MapView.tsx`, `src/pages/Profile.tsx` — Examples of page components inside AppShell.
- `src/components/map/RegionBottomSheet.tsx` — You'll modify this to remove Telegram and add a board link.
- `src/global.css` — All layout styles. Uses CSS custom properties (`--colour-primary`, `--colour-surface`, etc.). Match this pattern for new styles.
- Components use inline styles referencing CSS custom properties, with shared layout classes in global.css.
- `supabase/migrations/001_mvp_tables_rls.sql` and `002_member_count_trigger.sql` — Examples of migration format. Match this style for 003.

**Supabase RLS pattern:** Uses `is_current_user_verified()` SECURITY DEFINER helper function to check verification without infinite recursion. Reuse this in new policies.

## Implementation Order

Follow the 8 steps in `docs/phase-1.6-gb-boards.md` Section 8, and the matching task list in `docs/goals-checklist.md` Phase 1.6:

1. **Database migration** — Write `supabase/migrations/003_boards_and_posts.sql`. Tables, indexes, triggers, RLS, storage bucket config, seed data. **Do not run it** — Dennis will run it manually in Supabase SQL Editor.
2. **Data API layer** — `src/lib/boardsApi.ts` with all Supabase queries.
3. **Routing & navigation** — New routes in App.tsx, third nav tab in AppShell, update RegionBottomSheet.
4. **Board list & board view** — `BoardList.tsx`, `BoardView.tsx`, `PostCard.tsx`, `SortTabs.tsx`, `TimeAgo.tsx`.
5. **Post detail & comments** — `NewPost.tsx`, `PostDetail.tsx`, `CommentItem.tsx`.
6. **Voting** — `VoteButton.tsx` with optimistic UI.
7. **Image uploads** — `ImageUploader.tsx` (client-side resize/compress/EXIF strip), `ImageCarousel.tsx`.
8. **Polish & testing** — Empty states, loading skeletons, error handling, TypeScript check.

## File Placement

- New pages: `src/pages/` (BoardList.tsx, BoardView.tsx, NewPost.tsx, PostDetail.tsx)
- New components: `src/components/boards/` (PostCard.tsx, CommentItem.tsx, VoteButton.tsx, SortTabs.tsx, ImageUploader.tsx, ImageCarousel.tsx, TimeAgo.tsx)
- API module: `src/lib/boardsApi.ts`
- Migration: `supabase/migrations/003_boards_and_posts.sql`
- New board styles: add to `src/global.css` (follow existing patterns, use CSS custom properties)

## Critical Rules

- **The Tortoise Principle.** Build slowly, carefully, deeply. No placeholder code. No "come back to later." Every piece of work must be complete and tested.
- **Mark every completed task** in `docs/goals-checklist.md` with `✅ Completed: DD MMM YYYY, HH:MM`.
- **Match existing patterns.** Do not introduce new conventions, folder structures, or naming schemes without discussing it first.
- **Comment your reasoning**, not just what the code does.
- **No hardcoded values** — use CSS custom properties, constants, or config.
- **RLS is the security boundary**, not the frontend. Every table must have RLS enabled with explicit policies.
- **Optimistic UI on votes** — update the count instantly, roll back on error.
- **Client-side image processing** — resize to max 1200px, strip EXIF via canvas re-export, compress to 80% JPEG. No server-side pipeline.
- **Flat comments with reply_to hint** — not full nesting. See DEC-027.
- **Hot sort = last_comment_at DESC** for MVP — no decay algorithm. See DEC-029.

## What Dennis Needs To Do Manually

After you write the migration SQL, tell Dennis:
1. Run `003_boards_and_posts.sql` in the Supabase SQL Editor
2. Create the `board-images` storage bucket in the Supabase dashboard (or include bucket creation in the SQL if Supabase supports it)

You cannot run these yourself — you don't have direct database access.

## Test Account

- Email: `test1@restorebritain.uk`
- Password: `RestoreBritain2026!`
- Dev server: `npx vite --host` (for phone access on local network)
