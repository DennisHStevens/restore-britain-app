-- =============================================================
-- Restore Britain Platform — Soft Delete RPC Functions
-- Migration 012: Server-side soft delete for posts and comments
-- =============================================================
-- The UPDATE-based soft delete approach hit persistent RLS issues:
-- PERMISSIVE policies on posts have conflicting WITH CHECK clauses
-- that block setting deleted_at, even for admins. Rather than
-- patching RLS rules with increasingly fragile workarounds, we
-- move the delete logic into SECURITY DEFINER functions that:
--   1. Verify the caller is authorised (author, commander, or admin)
--   2. Perform the soft delete directly, bypassing RLS
--
-- This is architecturally cleaner — business rules live in one
-- place (the function) instead of scattered across multiple
-- overlapping RLS policies.
--
-- Date: 22 February 2026
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. SOFT DELETE POST
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.soft_delete_post(target_post_id uuid)
RETURNS void AS $$
DECLARE
  v_post RECORD;
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_caller_region_id uuid;
  v_board_scope_id uuid;
BEGIN
  -- Must be authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch the post (must exist and not already be deleted)
  SELECT id, author_id, board_id
    INTO v_post
    FROM public.posts
    WHERE id = target_post_id
      AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found or already deleted';
  END IF;

  -- Get caller's role and region
  SELECT role, region_id
    INTO v_caller_role, v_caller_region_id
    FROM public.profiles
    WHERE id = v_caller_id;

  -- Check authorisation:
  --   a) Author can delete their own post
  --   b) Admin/super_admin can delete any post
  --   c) Commander can delete posts in their region's board
  IF v_post.author_id = v_caller_id THEN
    -- Author — allowed
    NULL;
  ELSIF public.role_level(v_caller_role) >= public.role_level('admin') THEN
    -- Admin or super_admin — allowed
    NULL;
  ELSIF v_caller_role = 'commander' THEN
    -- Commander — only if this post is in their region's board
    SELECT b.scope_id
      INTO v_board_scope_id
      FROM public.boards b
      WHERE b.id = v_post.board_id;

    IF v_board_scope_id IS NULL OR v_board_scope_id != v_caller_region_id THEN
      RAISE EXCEPTION 'Commanders can only delete posts in their own region';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not authorised to delete this post';
  END IF;

  -- Perform the soft delete
  UPDATE public.posts
    SET deleted_at = now(),
        body = '[deleted]',
        image_urls = '{}'
    WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.soft_delete_post IS
  'Soft-deletes a post (sets deleted_at, clears body/images). '
  'Caller must be the author, a regional commander, or an admin.';


-- ─────────────────────────────────────────────────────────────
-- 2. SOFT DELETE COMMENT
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.soft_delete_comment(target_comment_id uuid)
RETURNS void AS $$
DECLARE
  v_comment RECORD;
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_caller_region_id uuid;
  v_board_scope_id uuid;
BEGIN
  -- Must be authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch the comment (must exist and not already be deleted)
  SELECT c.id, c.author_id, c.post_id
    INTO v_comment
    FROM public.comments c
    WHERE c.id = target_comment_id
      AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comment not found or already deleted';
  END IF;

  -- Get caller's role and region
  SELECT role, region_id
    INTO v_caller_role, v_caller_region_id
    FROM public.profiles
    WHERE id = v_caller_id;

  -- Check authorisation (same logic as posts but joins through post→board)
  IF v_comment.author_id = v_caller_id THEN
    NULL; -- Author
  ELSIF public.role_level(v_caller_role) >= public.role_level('admin') THEN
    NULL; -- Admin/super_admin
  ELSIF v_caller_role = 'commander' THEN
    SELECT b.scope_id
      INTO v_board_scope_id
      FROM public.posts p
      JOIN public.boards b ON b.id = p.board_id
      WHERE p.id = v_comment.post_id;

    IF v_board_scope_id IS NULL OR v_board_scope_id != v_caller_region_id THEN
      RAISE EXCEPTION 'Commanders can only delete comments in their own region';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not authorised to delete this comment';
  END IF;

  -- Perform the soft delete
  UPDATE public.comments
    SET deleted_at = now(),
        body = '[deleted]',
        image_urls = '{}'
    WHERE id = target_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.soft_delete_comment IS
  'Soft-deletes a comment (sets deleted_at, clears body/images). '
  'Caller must be the author, a regional commander, or an admin.';


-- ─────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────
-- After running this migration, the client calls:
--   supabase.rpc('soft_delete_post', { target_post_id: '...' })
--   supabase.rpc('soft_delete_comment', { target_comment_id: '...' })
-- instead of doing .update() directly on the posts/comments tables.
