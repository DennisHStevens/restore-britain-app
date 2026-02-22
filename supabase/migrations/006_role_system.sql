-- =============================================================
-- Restore Britain Platform — Role System
-- Migration 006: Add role hierarchy to profiles
-- =============================================================
-- Adds a 4-tier global role system:
--   member (default) → commander → admin → super_admin
--
-- Commanders can moderate posts/comments in their region's board.
-- Admins can moderate all boards globally + manage invite codes.
-- Super admins are permanent admins who cannot be demoted.
--
-- Date: 22 February 2026
-- Decision: DEC-034
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. ADD ROLE COLUMN TO PROFILES
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN role text NOT NULL DEFAULT 'member';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_valid_role
  CHECK (role IN ('member', 'commander', 'admin', 'super_admin'));

-- Set Dennis as super_admin
UPDATE public.profiles
  SET role = 'super_admin'
  WHERE id = '97075b58-4014-4218-9326-d2ed8510fd67';


-- ─────────────────────────────────────────────────────────────
-- 2. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Maps role name to a numeric level for comparison.
-- Higher number = more privilege.
CREATE OR REPLACE FUNCTION public.role_level(role_name text)
RETURNS integer AS $$
  SELECT CASE role_name
    WHEN 'member'      THEN 1
    WHEN 'commander'   THEN 2
    WHEN 'admin'       THEN 3
    WHEN 'super_admin' THEN 4
    ELSE 0
  END;
$$ LANGUAGE sql IMMUTABLE SET search_path = public;

COMMENT ON FUNCTION public.role_level IS 'Converts a role name to a numeric hierarchy level. member=1, commander=2, admin=3, super_admin=4.';


-- Returns the current user's role string.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'member'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_current_user_role IS 'Returns the role of the currently authenticated user. Defaults to member if no profile found.';


-- Returns true if the current user's role is at or above the given minimum.
CREATE OR REPLACE FUNCTION public.is_current_user_at_least(min_role text)
RETURNS boolean AS $$
  SELECT public.role_level(public.get_current_user_role())
    >= public.role_level(min_role);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.is_current_user_at_least IS 'Returns true if current user role >= the specified minimum role. Usage: is_current_user_at_least(''admin'')';


-- Returns the region_id of the current user (for commander scoping).
CREATE OR REPLACE FUNCTION public.get_current_user_region_id()
RETURNS uuid AS $$
  SELECT region_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_current_user_region_id IS 'Returns the region_id of the current user. Used to scope commander moderation to their own region.';


-- ─────────────────────────────────────────────────────────────
-- 3. UPDATE RLS POLICIES — POSTS
-- ─────────────────────────────────────────────────────────────

-- Drop the existing author-only UPDATE policy on posts.
-- We'll replace it with a combined policy that allows:
--   a) Authors to edit their own posts (any time, since we removed
--      the 15-min window for soft-delete in the comments policy)
--   b) Commanders to moderate posts in their region's board
--   c) Admins+ to moderate any post
DROP POLICY "Authors can edit own posts within 15 min" ON public.posts;

-- Authors can update their own non-deleted posts (edit body, soft-delete)
CREATE POLICY "Authors can update own posts"
  ON public.posts FOR UPDATE
  USING (
    auth.uid() = author_id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = author_id
  );

-- Commanders can moderate (soft-delete, lock/unlock) posts in their
-- region's board. They match on board.scope_id = their region_id.
-- National board (scope_id IS NULL) requires admin.
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
  );

-- Admins and super_admins can moderate any post in any board
CREATE POLICY "Admins can moderate all posts"
  ON public.posts FOR UPDATE
  USING (
    public.is_current_user_at_least('admin')
  );


-- ─────────────────────────────────────────────────────────────
-- 4. UPDATE RLS POLICIES — COMMENTS
-- ─────────────────────────────────────────────────────────────

-- Drop the existing author-only UPDATE policy on comments.
-- (Migration 005 already replaced the original 15-min policy.)
DROP POLICY "Authors can update own comments" ON public.comments;

-- Authors can update (edit, soft-delete) their own non-deleted comments
CREATE POLICY "Authors can update own comments"
  ON public.comments FOR UPDATE
  USING (
    auth.uid() = author_id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = author_id
  );

-- Commanders can moderate comments in their region's board.
-- Joins through comments → posts → boards to check scope_id.
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
  );

-- Admins and super_admins can moderate any comment
CREATE POLICY "Admins can moderate all comments"
  ON public.comments FOR UPDATE
  USING (
    public.is_current_user_at_least('admin')
  );


-- ─────────────────────────────────────────────────────────────
-- 5. UPDATE RLS POLICIES — INVITE CODES (admin access)
-- ─────────────────────────────────────────────────────────────
-- Currently invite_codes has RLS enabled with NO policies,
-- meaning only service_role can access. We add a SELECT policy
-- so admins can view codes via the frontend admin panel.

CREATE POLICY "Admins can read invite codes"
  ON public.invite_codes FOR SELECT
  USING (
    public.is_current_user_at_least('admin')
  );


-- ─────────────────────────────────────────────────────────────
-- 6. PROTECT ROLE COLUMN
-- ─────────────────────────────────────────────────────────────
-- Prevent users from changing their own role via the existing
-- "Users can update own profile" policy. We do this by adding
-- a trigger that blocks role changes unless the updater is
-- super_admin (via service role or RPC).
--
-- Note: The existing profile UPDATE RLS policy allows users to
-- update their own profile. Without this trigger, a user could
-- SET role = 'super_admin' on their own profile. The trigger
-- prevents this by rejecting role changes from non-super_admins.

CREATE OR REPLACE FUNCTION public.protect_role_column()
RETURNS TRIGGER AS $$
BEGIN
  -- If role hasn't changed, allow the update (normal profile edits)
  IF NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;

  -- Only super_admins can change roles
  IF public.role_level(
    COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'member')
  ) < public.role_level('super_admin') THEN
    RAISE EXCEPTION 'Only super admins can change user roles';
  END IF;

  -- Prevent demoting super_admin (super_admin is permanent)
  IF OLD.role = 'super_admin' THEN
    RAISE EXCEPTION 'Super admin role cannot be removed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_protect_role_column
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_role_column();


-- ─────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────
-- Summary:
--   Added: profiles.role column (member/commander/admin/super_admin)
--   Functions: role_level(), get_current_user_role(),
--              is_current_user_at_least(), get_current_user_region_id(),
--              protect_role_column()
--   Updated policies: posts UPDATE (3 policies), comments UPDATE (3 policies)
--   New policy: invite_codes SELECT for admins
--   Trigger: protect_role_column prevents unauthorised role changes
--
-- After running: Verify Dennis is super_admin with:
--   SELECT id, username, role FROM profiles;
