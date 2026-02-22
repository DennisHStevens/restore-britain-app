# Phase 1.6 — gb/ Boards: In-App Community Forum

> **Decision:** Replace the Telegram group architecture with an in-app forum system branded as "gb/ Boards." Third-party messaging (Telegram, X DMs) is recommended for private conversation but the platform's community discussion lives entirely within the app. Only registered, verified members can view or participate.

---

## 1. Vision

gb/ Boards is Restore Britain's internal discussion system — the beating heart of the community. Think early Reddit (2009) but modernised: clean, fast, mobile-first, and built for political organising rather than general link-sharing.

Every board is prefixed `gb/` — a deliberate brand choice that signals ownership. `gb/national` is the first board. Regional boards (`gb/west-midlands`, `gb/scotland`, etc.) follow as membership grows, mapped 1:1 to existing regions in the database.

**What gb/ Boards replaces:** Phase 1.6 was originally "Telegram Group Architecture." That entire phase is superseded. The "Join Telegram Group" button on the region bottom sheet will be replaced with a "View Board" link. No Telegram group creation, no deeplinks, no third-party dependency.

**What gb/ Boards does NOT include (deferred to Goal 2):**
- Video uploads (static images only for now)
- X/Twitter post embeds
- Full-text search
- Moderation dashboard (admin tools)
- Push notifications for replies
- Rich text / markdown editor (plain text + images for MVP)

---

## 2. Data Model

### 2.1 Tables

The database architecture doc already defines `forum_categories`, `forum_posts`, `forum_replies`, and `reactions`. We adapt these with the following adjustments for gb/ Boards MVP:

#### `boards` (replaces `forum_categories`)

Renamed to `boards` to match the gb/ branding. Each board maps to a scope.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `name` | `text` | NOT NULL, UNIQUE | e.g., "National", "West Midlands" |
| `slug` | `text` | NOT NULL, UNIQUE | e.g., "national", "west-midlands" — used in gb/national URL |
| `description` | `text` | nullable | Short tagline shown in board header |
| `scope_type` | `text` | NOT NULL, CHECK IN ('national', 'region') | 'department' added later |
| `scope_id` | `uuid` | nullable, FK → regions(id) | NULL for national boards |
| `is_locked` | `boolean` | DEFAULT false | Prevent new posts |
| `post_count` | `integer` | DEFAULT 0 | Cached, maintained by trigger |
| `created_at` | `timestamptz` | DEFAULT now() | |

#### `posts`

Top-level discussion threads within a board.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `board_id` | `uuid` | FK → boards(id), NOT NULL | |
| `author_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `title` | `text` | NOT NULL, max 300 chars | Thread title |
| `body` | `text` | NOT NULL | Plain text content |
| `image_urls` | `text[]` | DEFAULT '{}' | Array of Supabase Storage URLs (max 4 images) |
| `is_pinned` | `boolean` | DEFAULT false | Sticks to top of board |
| `is_locked` | `boolean` | DEFAULT false | Prevents new comments |
| `upvote_count` | `integer` | DEFAULT 0 | Cached net upvotes |
| `comment_count` | `integer` | DEFAULT 0 | Cached, maintained by trigger |
| `last_comment_at` | `timestamptz` | nullable | For "hot" sorting |
| `created_at` | `timestamptz` | DEFAULT now() | |
| `updated_at` | `timestamptz` | DEFAULT now() | |
| `deleted_at` | `timestamptz` | nullable | Soft delete |

#### `comments`

Replies to posts. Flat with optional `reply_to_id` for threading context.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `post_id` | `uuid` | FK → posts(id), NOT NULL | |
| `author_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `body` | `text` | NOT NULL | Plain text |
| `image_urls` | `text[]` | DEFAULT '{}' | Max 2 images in comments |
| `reply_to_id` | `uuid` | FK → comments(id), nullable | Threading hint — "replying to X" |
| `upvote_count` | `integer` | DEFAULT 0 | Cached |
| `created_at` | `timestamptz` | DEFAULT now() | |
| `updated_at` | `timestamptz` | DEFAULT now() | |
| `deleted_at` | `timestamptz` | nullable | Soft delete |

#### `votes`

Replaces `reactions` from the original schema. Single upvote system (like early Reddit, not multi-reaction).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `target_type` | `text` | NOT NULL, CHECK IN ('post', 'comment') | |
| `target_id` | `uuid` | NOT NULL | ID of the post or comment |
| `value` | `smallint` | NOT NULL, CHECK IN (1, -1) | +1 upvote, -1 downvote |
| `created_at` | `timestamptz` | DEFAULT now() | |

**Unique constraint:** `(user_id, target_type, target_id)` — one vote per user per target.

### 2.2 Indexes

```sql
-- Board post listing sorted by activity (hot)
CREATE INDEX idx_posts_board_activity ON posts(board_id, last_comment_at DESC NULLS LAST) WHERE deleted_at IS NULL;

-- Board post listing sorted by newest
CREATE INDEX idx_posts_board_newest ON posts(board_id, created_at DESC) WHERE deleted_at IS NULL;

-- Board post listing sorted by top (most upvoted)
CREATE INDEX idx_posts_board_top ON posts(board_id, upvote_count DESC) WHERE deleted_at IS NULL;

-- Comments for a post (chronological)
CREATE INDEX idx_comments_post ON comments(post_id, created_at ASC) WHERE deleted_at IS NULL;

-- Vote lookup (has user voted on this target?)
CREATE INDEX idx_votes_lookup ON votes(user_id, target_type, target_id);

-- Vote aggregation (count votes for a target)
CREATE INDEX idx_votes_target ON votes(target_type, target_id);
```

### 2.3 Triggers

```sql
-- 1. Auto-update posts.comment_count when comments are inserted/soft-deleted
-- 2. Auto-update posts.last_comment_at when comments are inserted
-- 3. Auto-update posts.upvote_count and comments.upvote_count when votes change
-- 4. Auto-update boards.post_count when posts are inserted/soft-deleted
-- 5. Reuse existing update_updated_at() trigger on posts and comments
```

### 2.4 Row Level Security

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `boards` | All verified members | Service role only | Service role only | Never |
| `posts` | All verified members (national boards); region members (regional boards — deferred, all verified for MVP) | Verified members (board not locked) | Author only (within 15 min edit window) | Author (soft delete, within 15 min) |
| `comments` | Same as posts | Verified members (post not locked) | Author only (within 15 min edit window) | Author (soft delete, within 15 min) |
| `votes` | Own votes only | Verified members | Verified members (change vote) | Verified members (remove vote) |

For MVP, all boards are visible to all verified members. Regional board scoping (only members of that region can see gb/west-midlands) is a Goal 2 enhancement.

### 2.5 Supabase Storage

A new public bucket `board-images` for user-uploaded images.

**Bucket policy:**
- Authenticated users can upload to their own folder: `{user_id}/{timestamp}-{random}.{ext}`
- All authenticated users can read (images are visible to anyone who can see the post)
- Users can delete their own images only
- Max file size: 5 MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

**Image processing (client-side before upload):**
- Resize to max 1200px on longest side (saves storage and bandwidth)
- Compress to ~80% quality JPEG/WebP
- Strip EXIF data (privacy — removes GPS coordinates, device info)

---

## 3. Sorting & Filtering

Three sort modes, matching Reddit's core sorting:

| Sort | Algorithm | Use Case |
|---|---|---|
| **Hot** (default) | Posts with recent comments rise. Score = `upvote_count + (comment_count × 0.5) + time_decay`. In practice for MVP: sort by `last_comment_at DESC NULLS LAST`, pinned posts first. | Default view — shows active discussion |
| **New** | Sort by `created_at DESC`, pinned first | See latest posts |
| **Top** | Sort by `upvote_count DESC`, pinned first | See most popular |

These sorts are implemented as different `ORDER BY` clauses on the same Supabase query — no additional tables or materialised views needed.

**Hot sort (MVP simplification):** True Reddit-style hot ranking uses a decay function (Wilson score, Hacker News algorithm, etc.). For an MVP with <100 posts, sorting by `last_comment_at` is functionally equivalent and costs zero computation. When post volume grows, we can introduce a proper `hot_score` column maintained by a scheduled function.

---

## 4. Frontend Architecture

### 4.1 New Routes

```
/boards              → BoardList     (all boards)
/boards/:slug        → BoardView     (post list for a board, e.g., /boards/national)
/boards/:slug/new    → NewPost       (compose a new post)
/boards/:slug/:id    → PostDetail    (single post + comments thread)
```

All routes are protected (inside `ProtectedRoute`), wrapped in `AppShell`.

### 4.2 Bottom Nav Update

The current bottom nav has two tabs: **Map** and **Profile**. Add a third tab between them:

```
  Map  |  Boards  |  Profile
```

Icon: speech bubble or message square (from same inline SVG pattern as existing icons).

### 4.3 New Pages

#### `BoardList.tsx` — `/boards`
- Lists all boards the user can see
- Each board card shows: `gb/{slug}`, description, post count, latest activity
- Tap a board → navigate to `/boards/{slug}`
- For MVP: just gb/national (one board). The list still exists as the shell for when regional boards are added.

#### `BoardView.tsx` — `/boards/:slug`
- Header: board name (`gb/national`), description
- Sort tabs: Hot | New | Top (pill-style toggle, same pattern as existing nav active state)
- Post list: each card shows title, author display_name, time ago, upvote count, comment count, image thumbnail (if present)
- Floating "+" compose button (bottom-right, above nav bar)
- Pull-to-refresh (or manual refresh button)
- Infinite scroll or "Load more" button for pagination (cursor-based, not offset)

#### `NewPost.tsx` — `/boards/:slug/new`
- Title field (max 300 chars, character counter)
- Body field (plain text, auto-expanding textarea)
- Image attach button (max 4 images, shown as thumbnails below body)
- "Post" button (top-right or bottom, disabled until title + body filled)
- Cancel/back button
- Shows board name in header so user knows where they're posting

#### `PostDetail.tsx` — `/boards/:slug/:id`
- Full post display: title, author (display name + region badge), time ago, body, images (carousel if multiple), upvote/downvote buttons, comment count
- Comments section below, sorted chronologically
- Each comment: author, time ago, body, images, upvote/downvote, "Reply" link
- Reply-to threading: if a comment is replying to another, show a small "↳ Replying to {name}" tag above it
- Compose comment at bottom: text field + image attach + send button
- Comment composer sticks to bottom of viewport (like a chat input)

### 4.4 New Components

#### `PostCard.tsx`
- Reusable card for post list items
- Shows: title (bold), author name, region tag, time-ago, body preview (first 2 lines, truncated), image thumbnail, upvote count, comment count
- Tap → navigate to PostDetail

#### `CommentItem.tsx`
- Single comment display
- Shows: author, time-ago, body, images, upvote/downvote, reply button
- Reply-to indicator if applicable

#### `VoteButton.tsx`
- Upvote/downvote arrows with count between them
- Optimistic UI: updates count immediately, rolls back on error
- Changes colour when user has voted (upvote = blue/primary, downvote = muted)
- Prevents double-tap (debounced)

#### `ImageUploader.tsx`
- Handles image selection, client-side resize/compression, EXIF stripping
- Shows upload progress
- Returns array of Supabase Storage URLs
- Used in both NewPost and comment composer

#### `ImageCarousel.tsx`
- Displays 1-4 images in a horizontal swipeable carousel
- Single image: displayed full-width, no carousel chrome
- Multiple images: dot indicators, swipe navigation
- Tap to expand full-screen (optional, can defer)

#### `TimeAgo.tsx`
- Utility component: converts timestamp to "2m ago", "3h ago", "1d ago", etc.
- Updates periodically (every 60s) for live feel

#### `SortTabs.tsx`
- Hot | New | Top toggle
- Pill-style buttons, active state matches brand primary colour

### 4.5 Updating Existing Components

#### `AppShell.tsx`
- Add "Boards" tab to bottom nav (3 tabs instead of 2)
- New SVG icon for Boards tab

#### `RegionBottomSheet.tsx`
- Replace "Join Telegram Group" button with "View gb/{region} Board" button (or show message that regional board coming soon if only gb/national exists)
- Remove Telegram-related code and placeholder

#### `App.tsx`
- Add new routes: `/boards`, `/boards/:slug`, `/boards/:slug/new`, `/boards/:slug/:id`
- All inside ProtectedRoute + AppShell

---

## 5. Image Upload Flow

1. User taps image button in composer
2. Native file picker opens (accepts `image/*`)
3. Client-side processing:
   - Read file as canvas
   - Resize to max 1200px longest side
   - Export as JPEG at 80% quality (or WebP if supported)
   - Strip EXIF via canvas re-export (canvas naturally strips EXIF)
4. Upload to Supabase Storage: `board-images/{user_id}/{timestamp}-{random}.jpg`
5. On success: store the public URL in the post/comment's `image_urls` array
6. On failure: show error, allow retry

**Why client-side processing:** Avoids needing a server-side image pipeline. Canvas resize + re-export is fast, strips EXIF automatically (privacy win), and keeps files under 5MB without requiring users to pre-compress. No external dependencies needed — all native browser APIs.

---

## 6. Vote Flow

1. User taps upvote arrow on a post or comment
2. **Optimistic update:** UI immediately increments count and highlights the arrow
3. Supabase upsert: `INSERT INTO votes ... ON CONFLICT (user_id, target_type, target_id) DO UPDATE SET value = $new_value`
4. If vote already exists with same value → DELETE (toggle off)
5. If vote already exists with different value → UPDATE (switch vote)
6. Trigger on `votes` table recalculates `upvote_count` on the target post/comment
7. On error: roll back optimistic update, show brief error toast

**Why triggers for count:** Same reasoning as `member_count` on regions (DEC-024). Vote counts are read on every post render (high frequency) but written on individual votes (lower frequency). A cached integer with trigger maintenance avoids `COUNT(*)` on every render.

---

## 7. SQL Migration Plan

One migration file: `supabase/migrations/003_boards_and_posts.sql`

**Creates:**
1. `boards` table + RLS
2. `posts` table + RLS
3. `comments` table + RLS
4. `votes` table + RLS + unique constraint
5. All indexes
6. Triggers: comment_count, last_comment_at, upvote_count, post_count, updated_at
7. Supabase Storage bucket `board-images` with policies
8. Seed data: gb/national board

**Dennis runs this in Supabase SQL Editor** (same pattern as migrations 001 and 002).

---

## 8. Implementation Order

Build bottom-up: database first, then data access, then UI.

### Step 1 — Database (migration SQL)
- Create all tables, indexes, triggers, RLS policies, storage bucket
- Seed gb/national board
- Dennis runs migration in Supabase SQL Editor

### Step 2 — Core Data Layer
- Create `src/lib/boardsApi.ts` — all Supabase queries for boards, posts, comments, votes
- Functions: `fetchBoards()`, `fetchPosts(boardId, sort, cursor)`, `fetchPost(postId)`, `fetchComments(postId)`, `createPost()`, `createComment()`, `castVote()`, `removeVote()`, `uploadImage()`
- All queries go through the Supabase client with RLS — no service role key

### Step 3 — Routing & Navigation
- Add routes to App.tsx
- Add Boards tab to AppShell bottom nav
- Update RegionBottomSheet (remove Telegram, add board link)

### Step 4 — Board List & Board View
- BoardList page (simple — just shows gb/national for now)
- BoardView page with sort tabs, post cards, compose button
- PostCard component
- SortTabs component
- TimeAgo utility

### Step 5 — Post Detail & Comments
- PostDetail page with full post display
- CommentItem component
- Comment composer (sticky bottom input)
- Reply-to threading indicator

### Step 6 — Voting
- VoteButton component with optimistic UI
- Wire into PostCard, PostDetail, CommentItem

### Step 7 — Image Uploads
- ImageUploader component (resize, compress, EXIF strip, upload)
- ImageCarousel component (swipeable display)
- Wire into NewPost and comment composer

### Step 8 — Polish & Testing
- Pagination (cursor-based "load more")
- Empty states (no posts yet, no comments yet)
- Loading skeletons
- Error handling for all API calls
- Test full flow: create post → view post → comment → vote → sort → upload image
- Mobile testing on iPhone

---

## 9. Decisions to Log

| ID | Decision | Key Reasoning |
|---|---|---|
| DEC-025 | Replace Telegram architecture with in-app gb/ Boards | Keeps users in-app, owns the data, no third-party dependency. Telegram/X recommended for private messaging only. |
| DEC-026 | Single upvote/downvote system (not multi-reaction) | Simpler, familiar (Reddit model), directly feeds sorting algorithm. Multi-reaction adds UI complexity without clear value at this scale. |
| DEC-027 | Flat comments with reply_to hint (not full nesting) | Full comment trees are complex to render and navigate on mobile. Flat + reply-to gives threading context without deep nesting UI. Can upgrade later. |
| DEC-028 | Client-side image processing (resize, EXIF strip, compress) | No server pipeline needed. Canvas API handles everything. Keeps images under 5MB, strips GPS/device data for privacy. |
| DEC-029 | Hot sort = last_comment_at for MVP | True decay-based hot ranking is overkill for <100 posts. Activity-based sort is functionally equivalent at low volume. Upgrade path: add hot_score column + scheduled function when volume demands it. |
| DEC-030 | Boards visible to all verified members for MVP | Regional board scoping (only region members see gb/west-midlands) is a Goal 2 enhancement. For MVP with <50 users, visibility restrictions add friction without value. |

---

## 10. Summary

Phase 1.6 builds gb/ Boards — a members-only discussion forum branded with the `gb/` prefix. It replaces the Telegram group architecture entirely. The system supports:

- **Boards:** gb/national at launch, regional boards added as membership grows
- **Posts:** Title + body + up to 4 images, sorted by Hot/New/Top
- **Comments:** Flat with reply-to threading hints, images allowed
- **Voting:** Reddit-style upvote/downvote with optimistic UI, cached counts via triggers
- **Images:** Client-side resize/compress/EXIF-strip, stored in Supabase Storage
- **Gating:** Only verified members can view or post — enforced by RLS

**New database objects:** 4 tables, 6 indexes, 5 triggers, 1 storage bucket, ~10 RLS policies.
**New frontend files:** ~12 new components/pages, 1 API module, route updates, nav update.
**Modified files:** AppShell (nav), App.tsx (routes), RegionBottomSheet (remove Telegram).
**Implementation:** 8 steps, built bottom-up from database to UI.

The Telegram "Join Group" button becomes a "View Board" link. Third-party messaging is recommended but not integrated — the community lives in gb/ Boards.
