-- =============================================================
-- Restore Britain Platform — Super Admin Profile Updates
-- Migration 007: Allow super_admins to update other profiles
-- =============================================================
-- Fixes: Role changes from AdminPanel silently fail because the
-- only UPDATE policy on profiles is "Users can update own profile"
-- (auth.uid() = id). When a super_admin changes someone else's
-- role, RLS blocks the query before the protect_role_column
-- trigger even fires.
--
-- Solution: Add an UPDATE policy allowing super_admins to update
-- any profile row. The existing trg_protect_role_column trigger
-- still enforces that only super_admins can change the role field
-- and that super_admin status cannot be revoked.
--
-- Date: 22 February 2026
-- =============================================================

CREATE POLICY "Super admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    public.is_current_user_at_least('super_admin')
  )
  WITH CHECK (
    public.is_current_user_at_least('super_admin')
  );

-- =============================================================
-- DONE
-- Summary:
--   Added: UPDATE policy on profiles for super_admins
--   This works alongside the existing trigger protection:
--     - RLS allows super_admin to update any row
--     - trg_protect_role_column ensures only role changes are
--       from super_admins (redundant but defence-in-depth)
--     - trg_protect_role_column prevents demoting super_admins
-- =============================================================
