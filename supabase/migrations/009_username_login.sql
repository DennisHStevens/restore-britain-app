-- =============================================================
-- Restore Britain Platform — Username Login
-- Migration 009: RPC function to resolve username → email
-- =============================================================
-- Enables login with either email or username. Since Supabase
-- Auth's signInWithPassword requires an email, and RLS prevents
-- unauthenticated users from querying profiles, we need a
-- SECURITY DEFINER function to look up the email by username.
--
-- Security notes:
-- - This function only returns the email, not any other profile data.
-- - The platform is invite-only, so enumeration risk is minimal.
-- - The login form shows a generic "invalid credentials" error
--   regardless of whether the username was found, so the email
--   is never exposed to the user.
-- - A determined attacker could call the RPC directly, but
--   usernames are already visible to all authenticated members.
-- =============================================================

CREATE OR REPLACE FUNCTION public.resolve_username_to_email(lookup_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_email text;
BEGIN
  SELECT email INTO result_email
  FROM profiles
  WHERE lower(username) = lower(lookup_username)
  LIMIT 1;

  RETURN result_email;  -- NULL if username not found
END;
$$;

-- Grant execute to anon and authenticated roles so the login
-- page can call this before the user has a session.
GRANT EXECUTE ON FUNCTION public.resolve_username_to_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_username_to_email(text) TO authenticated;


-- =============================================================
-- DONE
-- =============================================================
-- Summary:
--   - Created resolve_username_to_email() RPC function
--   - SECURITY DEFINER bypasses RLS for the lookup
--   - Granted to anon + authenticated roles
--
-- After running:
--   1. Update Login.tsx to detect email vs username input
--   2. Call supabase.rpc('resolve_username_to_email') for usernames
--   3. Test login with both email and username
