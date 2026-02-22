-- =============================================================
-- Restore Britain Platform — Username System
-- Migration 004: Replace display_name with username
-- =============================================================
-- Usernames replace display names as the primary user identity.
-- They function like Twitter/Reddit handles — unique, lowercase,
-- alphanumeric with underscores, 3-20 characters.
--
-- This migration:
--   1. Adds a `username` column to profiles
--   2. Generates placeholder usernames for existing accounts
--   3. Makes username NOT NULL and UNIQUE
--   4. Drops display_name column
--   5. Updates RLS policies for the new column
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. ADD USERNAME COLUMN (nullable initially for migration)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN username text;

-- Unique index (case-insensitive) — prevents "JohnDoe" and "johndoe"
-- from coexisting. Uses lower() so lookups are always case-insensitive.
CREATE UNIQUE INDEX idx_profiles_username_lower
  ON public.profiles (lower(username));

-- Check constraint: 3-20 chars, alphanumeric + underscores only
-- Username is stored as-is but uniqueness is case-insensitive
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_username_format
  CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');


-- ─────────────────────────────────────────────────────────────
-- 2. GENERATE PLACEHOLDER USERNAMES FOR EXISTING ACCOUNTS
-- ─────────────────────────────────────────────────────────────
-- Strategy: use the part before @ in email, sanitize to allowed
-- chars, ensure 3+ chars, append random suffix for uniqueness.

UPDATE public.profiles
SET username = (
  -- Take email prefix, replace non-alphanumeric with underscore,
  -- truncate to 14 chars, append 5 random chars for uniqueness
  substring(
    regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g')
    FROM 1 FOR 14
  )
  || '_'
  || substring(md5(random()::text) FROM 1 FOR 4)
)
WHERE username IS NULL;

-- Ensure any very short results get padded
UPDATE public.profiles
SET username = username || '_' || substring(md5(random()::text) FROM 1 FOR 4)
WHERE length(username) < 3;


-- ─────────────────────────────────────────────────────────────
-- 3. MAKE USERNAME NOT NULL
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- 4. DROP DISPLAY_NAME COLUMN
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  DROP COLUMN display_name;


-- ─────────────────────────────────────────────────────────────
-- 5. UPDATE THE AUTO-CREATE TRIGGER
-- ─────────────────────────────────────────────────────────────
-- The on_auth_user_created trigger inserts a bare profile row.
-- It previously set display_name = ''. Now it needs to set a
-- temporary username. The Edge Function will overwrite it with
-- the user's chosen username immediately after.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    -- Temporary username: 'user_' + first 15 chars of UUID
    'user_' || substring(replace(NEW.id::text, '-', '') FROM 1 FOR 15)
  );
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────
-- Summary:
--   - Added `username` column (NOT NULL, unique case-insensitive)
--   - Check constraint: ^[a-zA-Z0-9_]{3,20}$
--   - Generated placeholder usernames for existing accounts
--   - Dropped `display_name` column
--   - Updated handle_new_user() trigger to set temp username
--
-- After running:
--   1. Update the Edge Function to accept and set `username`
--   2. Update frontend Profile type and all display_name references
--   3. Test registration with new username field
