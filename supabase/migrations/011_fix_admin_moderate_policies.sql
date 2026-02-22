-- =============================================================
-- Restore Britain Platform — RLS Policy Fix
-- Migration 011: Fix admin + commander moderate policies
-- =============================================================
-- Bug: Admin/commander UPDATE policies on posts and comments had
-- no explicit WITH CHECK clause. PostgreSQL defaults WITH CHECK
-- to match USING, but when combined with PERMISSIVE policies from
-- other roles (e.g. the author policy checks `deleted_at IS NULL`),
-- the NEW row must pass at least one policy's WITH CHECK. Without
-- an explicit WITH CHECK on admin/commander policies, soft-deleting
-- a post (setting deleted_at) would fail because the author policy's
-- USING clause (which becomes the implicit WITH CHECK) rejects
-- rows where deleted_at IS NOT NULL.
--
-- Fix: Add explicit WITH CHECK clauses to all admin and commander
-- moderate policies on both posts and comments.
--
-- Date: 22 February 2026
-- Decision: DEC-034 (amendment)
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. FIX POSTS POLICIES
-- ─────────────────────────────────────────────────────────────

-- Fix "Admins can moderate all posts" — add explicit WITH CHECK
DROP POLICY IF EXISTS "Admins can moderate all posts" ON public.posts;
CREATE POLICY "Admins can moderate all posts"
  ON public.posts FOR UPDATE
  USING (
    public.is_current_user_at_least('admin')
  )
  WITH CHECK (
    public.is_current_user_at_least('admin')
  );

-- Fix "Commanders can moderate regional posts" — add explicit WITH CHECK
DROP POLICY IF EXISTS "Commanders can moderate regional posts" ON public.posts;
CREATE POLICY "Commanders can moderate regional posts"
  ON public.posts FOR UPDATE
  USING (
    public.get_current_user_role() = 'commander'
    AND EXISTS (
      SELECT 1 FROM public.boards b
        WHERE b.id = board_id
        AND b.scope_id IS NOT NULL
        AND b.scope_id = public.get_current_user_region_id()
    )
  )
  WITH CHECK (
    public.get_current_user_role() = 'commander'
    AND EXISTS (
      SELECT 1 FROM public.boards b
        WHERE b.id = board_id
        AND b.scope_id IS NOT NULL
        AND b.scope_id = public.get_current_user_region_id()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 2. FIX COMMENTS POLICIES
-- ─────────────────────────────────────────────────────────────

-- Fix "Admins can moderate all comments" — add explicit WITH CHECK
DROP POLICY IF EXISTS "Admins can moderate all comments" ON public.comments;
CREATE POLICY "Admins can moderate all comments"
  ON public.comments FOR UPDATE
  USING (
    public.is_current_user_at_least('admin')
  )
  WITH CHECK (
    public.is_current_user_at_least('admin')
  );

-- Fix "Commanders can moderate regional comments" — add explicit WITH CHECK
DROP POLICY IF EXISTS "Commanders can moderate regional comments" ON public.comments;
CREATE POLICY "Commanders can moderate regional comments"
  ON public.comments FOR UPDATE
  USING (
    public.get_current_user_role() = 'commander'
    AND EXISTS (
      SELECT 1 FROM public.posts p
        JOIN public.boards b ON b.id = p.board_id
        WHERE p.id = post_id
        AND b.scope_id IS NOT NULL
        AND b.scope_id = public.get_current_user_region_id()
    )
  )
  WITH CHECK (
    public.get_current_user_role() = 'commander'
    AND EXISTS (
      SELECT 1 FROM public.posts p
        JOIN public.boards b ON b.id = p.board_id
        WHERE p.id = post_id
        AND b.scope_id IS NOT NULL
        AND b.scope_id = public.get_current_user_region_id()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────
-- Summary:
--   Fixed 4 policies by adding explicit WITH CHECK clauses:
--   - "Admins can moderate all posts"
--   - "Commanders can moderate regional posts"
--   - "Admins can moderate all comments"
--   - "Commanders can moderate regional comments"
--
-- The admin posts policy was already applied live on 22 Feb 2026.
-- This migration file ensures the remaining 3 policies are also
-- fixed and all changes are version-controlled.
