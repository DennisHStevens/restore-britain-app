-- Migration 005: Update comment RLS for Reddit-style soft delete
--
-- Problem: The existing SELECT policy on comments filters out deleted_at IS NOT NULL,
-- which means soft-deleted parent comments vanish entirely — breaking the threaded
-- comment tree. Reddit keeps deleted comments as "[deleted]" placeholders so the
-- reply chain below them is preserved.
--
-- Changes:
-- 1. SELECT policy: allow reading ALL comments (including soft-deleted) so the
--    tree structure is preserved. The frontend renders deleted comments as
--    "[deleted]" placeholders — body, images, and author are hidden client-side.
-- 2. UPDATE policy: remove the 15-minute restriction so authors can soft-delete
--    their own comments at any time. The WITH CHECK still ensures author_id stays
--    the same, preventing any hijacking.
--
-- Date: 22 February 2026
-- Decision: DEC-033

-- ─── 1. Fix SELECT: include soft-deleted comments for tree integrity ───

DROP POLICY "Verified members can read comments" ON public.comments;

CREATE POLICY "Verified members can read comments"
  ON public.comments FOR SELECT
  USING (
    public.is_current_user_verified()
  );

-- ─── 2. Fix UPDATE: allow soft-delete at any time (not just 15 min) ───

DROP POLICY "Authors can edit own comments within 15 min" ON public.comments;

CREATE POLICY "Authors can update own comments"
  ON public.comments FOR UPDATE
  USING (
    auth.uid() = author_id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = author_id
  );

-- Note: the USING clause still requires deleted_at IS NULL, meaning you
-- can only update (or soft-delete) a comment that hasn't already been
-- deleted. Once deleted, it's permanent — no edits allowed. The 15-minute
-- edit window is removed so authors can delete their comments at any time.
-- Body edits are controlled by the frontend (not enforced at RLS level).
