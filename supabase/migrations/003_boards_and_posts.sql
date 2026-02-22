-- =============================================================
-- Restore Britain Platform — gb/ Boards
-- Migration 003: Boards, Posts, Comments, Votes, Storage
-- =============================================================
-- This migration creates the four tables for the gb/ Boards
-- in-app forum system, plus indexes, triggers, RLS policies,
-- storage bucket configuration, and seed data.
--
-- Run this in the Supabase SQL Editor as the postgres role.
--
-- After running this migration, also create the `board-images`
-- storage bucket via the Supabase dashboard (Storage → New Bucket)
-- with the following settings:
--   - Name: board-images
--   - Public: Yes
--   - File size limit: 5 MB
--   - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────

-- 1a. BOARDS — replaces forum_categories from the original schema.
-- Each board maps to a scope (national, region). The gb/ prefix
-- is a UI concern — the slug stored here is just "national", not
-- "gb/national".

CREATE TABLE public.boards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  description text,
  scope_type  text NOT NULL CHECK (scope_type IN ('national', 'region')),
  scope_id    uuid REFERENCES public.regions(id),
  is_locked   boolean DEFAULT false,
  post_count  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE public.boards IS 'gb/ Boards — discussion boards. Each board is either national (scope_id NULL) or regional (scope_id references regions).';


-- 1b. POSTS — top-level discussion threads within a board.

CREATE TABLE public.posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id        uuid NOT NULL REFERENCES public.boards(id),
  author_id       uuid NOT NULL REFERENCES public.profiles(id),
  title           text NOT NULL CHECK (char_length(title) <= 300),
  body            text NOT NULL,
  image_urls      text[] DEFAULT '{}',
  is_pinned       boolean DEFAULT false,
  is_locked       boolean DEFAULT false,
  upvote_count    integer DEFAULT 0,
  comment_count   integer DEFAULT 0,
  last_comment_at timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz
);

COMMENT ON TABLE public.posts IS 'Top-level discussion threads within a board. Supports up to 4 images, pinning, locking, and soft delete.';


-- 1c. COMMENTS — replies to posts. Flat with optional reply_to_id
-- for threading context (see DEC-027).

CREATE TABLE public.comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid NOT NULL REFERENCES public.posts(id),
  author_id    uuid NOT NULL REFERENCES public.profiles(id),
  body         text NOT NULL,
  image_urls   text[] DEFAULT '{}',
  reply_to_id  uuid REFERENCES public.comments(id),
  upvote_count integer DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  deleted_at   timestamptz
);

COMMENT ON TABLE public.comments IS 'Flat comments on posts with optional reply_to_id for threading hints. Max 2 images per comment.';


-- 1d. VOTES — replaces reactions from the original schema (see DEC-026).
-- Single upvote/downvote system. One vote per user per target.

CREATE TABLE public.votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id),
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id   uuid NOT NULL,
  value       smallint NOT NULL CHECK (value IN (1, -1)),
  created_at  timestamptz DEFAULT now(),

  -- One vote per user per target — enforces the single-vote rule
  CONSTRAINT votes_unique_per_user_target UNIQUE (user_id, target_type, target_id)
);

COMMENT ON TABLE public.votes IS 'Upvote/downvote system for posts and comments. One vote per user per target. Value is +1 (upvote) or -1 (downvote).';


-- ─────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ─────────────────────────────────────────────────────────────

-- Board post listing sorted by activity (hot) — pinned posts
-- are handled in the application query, not the index
CREATE INDEX idx_posts_board_activity
  ON public.posts(board_id, last_comment_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;

-- Board post listing sorted by newest
CREATE INDEX idx_posts_board_newest
  ON public.posts(board_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Board post listing sorted by top (most upvoted)
CREATE INDEX idx_posts_board_top
  ON public.posts(board_id, upvote_count DESC)
  WHERE deleted_at IS NULL;

-- Comments for a post (chronological)
CREATE INDEX idx_comments_post
  ON public.comments(post_id, created_at ASC)
  WHERE deleted_at IS NULL;

-- Vote lookup — has this user voted on this target?
CREATE INDEX idx_votes_lookup
  ON public.votes(user_id, target_type, target_id);

-- Vote aggregation — count votes for a target
CREATE INDEX idx_votes_target
  ON public.votes(target_type, target_id);


-- ─────────────────────────────────────────────────────────────
-- 3. TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- 3a. Reuse existing update_updated_at() from migration 001
-- for posts and comments updated_at columns.

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 3b. COMMENT COUNT & LAST_COMMENT_AT maintenance on posts.
-- When a comment is inserted or soft-deleted, update the parent
-- post's comment_count and last_comment_at.

CREATE OR REPLACE FUNCTION public.update_post_comment_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New comment: increment count and update last_comment_at
    UPDATE posts
      SET comment_count = comment_count + 1,
          last_comment_at = NEW.created_at
      WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Check if this is a soft delete (deleted_at changed from NULL to non-NULL)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE posts
        SET comment_count = GREATEST(comment_count - 1, 0)
        WHERE id = NEW.post_id;
    END IF;
    -- Check if this is an un-delete (deleted_at changed from non-NULL to NULL)
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE posts
        SET comment_count = comment_count + 1
        WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_post_comment_stats
  AFTER INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_stats();


-- 3c. POST COUNT maintenance on boards.
-- When a post is inserted or soft-deleted, update the parent
-- board's post_count.

CREATE OR REPLACE FUNCTION public.update_board_post_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE boards
      SET post_count = post_count + 1
      WHERE id = NEW.board_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Soft delete: decrement
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE boards
        SET post_count = GREATEST(post_count - 1, 0)
        WHERE id = NEW.board_id;
    END IF;
    -- Un-delete: increment
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE boards
        SET post_count = post_count + 1
        WHERE id = NEW.board_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_board_post_count
  AFTER INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_board_post_count();


-- 3d. UPVOTE COUNT maintenance on posts and comments.
-- When a vote is inserted, updated, or deleted, recalculate
-- the upvote_count on the target post or comment.
--
-- We use a full SUM rather than increment/decrement because
-- vote changes can be complex (insert, flip value, delete).
-- At low volume this is negligible; the index on
-- (target_type, target_id) keeps the aggregation fast.

CREATE OR REPLACE FUNCTION public.update_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_type text;
  v_target_id uuid;
  v_new_count integer;
BEGIN
  -- Determine which target to update
  IF TG_OP = 'DELETE' THEN
    v_target_type := OLD.target_type;
    v_target_id := OLD.target_id;
  ELSE
    v_target_type := NEW.target_type;
    v_target_id := NEW.target_id;
  END IF;

  -- Calculate the new vote sum for this target
  SELECT COALESCE(SUM(value), 0) INTO v_new_count
    FROM votes
    WHERE target_type = v_target_type AND target_id = v_target_id;

  -- Update the appropriate table
  IF v_target_type = 'post' THEN
    UPDATE posts SET upvote_count = v_new_count WHERE id = v_target_id;
  ELSIF v_target_type = 'comment' THEN
    UPDATE comments SET upvote_count = v_new_count WHERE id = v_target_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_vote_count
  AFTER INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.update_vote_count();


-- ─────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;


-- 4a. BOARDS RLS
-- All verified members can read. Only service role can modify.

CREATE POLICY "Verified members can read boards"
  ON public.boards FOR SELECT
  USING (public.is_current_user_verified());


-- 4b. POSTS RLS

-- Read: all verified members can see non-deleted posts (DEC-030: no regional scoping for MVP)
CREATE POLICY "Verified members can read posts"
  ON public.posts FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.is_current_user_verified()
  );

-- Insert: verified members can create posts in unlocked boards
CREATE POLICY "Verified members can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    public.is_current_user_verified()
    AND auth.uid() = author_id
    AND NOT EXISTS (
      SELECT 1 FROM boards WHERE id = board_id AND is_locked = true
    )
  );

-- Update: author only, within 15-minute edit window
CREATE POLICY "Authors can edit own posts within 15 min"
  ON public.posts FOR UPDATE
  USING (
    auth.uid() = author_id
    AND created_at > now() - interval '15 minutes'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = author_id
  );

-- Delete (soft): author only, within 15-minute window.
-- We implement soft delete as an UPDATE setting deleted_at,
-- so the UPDATE policy above covers this. No actual DELETE policy
-- is needed — physical deletes are service-role only.


-- 4c. COMMENTS RLS

-- Read: all verified members can see non-deleted comments
CREATE POLICY "Verified members can read comments"
  ON public.comments FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.is_current_user_verified()
  );

-- Insert: verified members can comment on unlocked posts
CREATE POLICY "Verified members can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    public.is_current_user_verified()
    AND auth.uid() = author_id
    AND NOT EXISTS (
      SELECT 1 FROM posts WHERE id = post_id AND is_locked = true
    )
  );

-- Update: author only, within 15-minute edit window
CREATE POLICY "Authors can edit own comments within 15 min"
  ON public.comments FOR UPDATE
  USING (
    auth.uid() = author_id
    AND created_at > now() - interval '15 minutes'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = author_id
  );


-- 4d. VOTES RLS

-- Read: users can see their own votes only (needed for UI highlight)
CREATE POLICY "Users can read own votes"
  ON public.votes FOR SELECT
  USING (auth.uid() = user_id);

-- Insert: verified members can vote
CREATE POLICY "Verified members can vote"
  ON public.votes FOR INSERT
  WITH CHECK (
    public.is_current_user_verified()
    AND auth.uid() = user_id
  );

-- Update: users can change their own vote (e.g., flip from upvote to downvote)
CREATE POLICY "Users can update own votes"
  ON public.votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete: users can remove their own vote (toggle off)
CREATE POLICY "Users can delete own votes"
  ON public.votes FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 5. STORAGE BUCKET POLICIES
-- ─────────────────────────────────────────────────────────────
-- The board-images bucket must be created via the Supabase
-- dashboard (Storage section). These policies control access.
--
-- NOTE: If the bucket already exists when running this, these
-- statements will be applied to it. If not, create the bucket
-- first via the dashboard, then run these policies.

-- Allow authenticated users to upload to their own folder
-- Path pattern: board-images/{user_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'board-images',
  'board-images',
  true,
  5242880,  -- 5 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Storage RLS policies for the board-images bucket
CREATE POLICY "Authenticated users can upload board images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'board-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can read board images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'board-images'
  );

CREATE POLICY "Users can delete own board images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'board-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─────────────────────────────────────────────────────────────
-- 6. SEED DATA
-- ─────────────────────────────────────────────────────────────

-- The first board: gb/national — visible to all verified members
INSERT INTO public.boards (name, slug, description, scope_type)
VALUES (
  'National',
  'national',
  'The national discussion board for all Restore Britain members.',
  'national'
);


-- ─────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────
-- Summary of what was created:
--   Tables: boards, posts, comments, votes
--   Indexes: 6 (post listing x3, comments chronological, vote lookup, vote aggregation)
--   Triggers: 4 (post comment_count/last_comment_at, board post_count, vote count, updated_at x2)
--   Functions: 3 (update_post_comment_stats, update_board_post_count, update_vote_count)
--   RLS: enabled on all 4 tables with ~10 policies
--   Storage: board-images bucket with upload/read/delete policies
--   Seed: gb/national board
--
-- After running this migration:
-- 1. Verify the board-images bucket was created in Storage
-- 2. Test that the gb/national board is visible to authenticated users
-- 3. Test RLS: unauthenticated queries should return zero rows
