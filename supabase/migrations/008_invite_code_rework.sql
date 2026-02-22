-- =============================================================
-- Restore Britain Platform — Invite Code Rework
-- Migration 008: Simplify invite codes to single-use, trackable
-- =============================================================
-- Changes:
--   - Wipe all existing codes (fresh start)
--   - Remove multi-use columns (max_uses, times_used, expires_at)
--   - Remove generated_by, replace with created_by
--   - Add used_by (FK to profiles) and used_at for usage tracking
--   - New code format: 8-char uppercase alphanumeric (e.g. K7X2M4NP)
--   - RLS: admin+ can read, super_admin can insert
--   - Seed 20 fresh codes
--
-- Date: 22 February 2026
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. WIPE EXISTING CODES
-- ─────────────────────────────────────────────────────────────
-- Also clear invite_code_used references in profiles since those
-- codes won't exist any more. This is safe because the field is
-- informational only — it doesn't affect auth or access.

UPDATE public.profiles SET invite_code_used = NULL WHERE invite_code_used IS NOT NULL;
DELETE FROM public.invite_codes;


-- ─────────────────────────────────────────────────────────────
-- 2. ALTER TABLE — REMOVE OLD COLUMNS, ADD NEW ONES
-- ─────────────────────────────────────────────────────────────

-- Drop old columns
ALTER TABLE public.invite_codes DROP COLUMN IF EXISTS max_uses;
ALTER TABLE public.invite_codes DROP COLUMN IF EXISTS times_used;
ALTER TABLE public.invite_codes DROP COLUMN IF EXISTS expires_at;
ALTER TABLE public.invite_codes DROP COLUMN IF EXISTS generated_by;

-- Add new columns
ALTER TABLE public.invite_codes
  ADD COLUMN used_by uuid REFERENCES public.profiles(id),
  ADD COLUMN used_at timestamptz,
  ADD COLUMN created_by uuid REFERENCES public.profiles(id);

-- Index for quick lookups: "find this code if it's unused"
CREATE INDEX IF NOT EXISTS idx_invite_codes_unused
  ON public.invite_codes (code) WHERE used_by IS NULL;

COMMENT ON TABLE public.invite_codes IS 'Single-use invite codes. 8-char uppercase alphanumeric. Each code can be used exactly once. Tracked: who created it, who used it, when.';


-- ─────────────────────────────────────────────────────────────
-- 3. RLS POLICIES
-- ─────────────────────────────────────────────────────────────
-- Drop any existing policies first (migration 006 added one)

DROP POLICY IF EXISTS "Admins can read invite codes" ON public.invite_codes;

-- Admin+ can read all codes (for the admin panel)
CREATE POLICY "Admins can read invite codes"
  ON public.invite_codes FOR SELECT
  USING (
    public.is_current_user_at_least('admin')
  );

-- Super admin can insert new codes (generate button)
CREATE POLICY "Super admins can insert invite codes"
  ON public.invite_codes FOR INSERT
  WITH CHECK (
    public.is_current_user_at_least('super_admin')
  );

-- Super admin can update codes (for when the edge function marks
-- them as used via service_role, this policy is belt-and-braces)
CREATE POLICY "Super admins can update invite codes"
  ON public.invite_codes FOR UPDATE
  USING (
    public.is_current_user_at_least('super_admin')
  );


-- ─────────────────────────────────────────────────────────────
-- 4. CODE GENERATION FUNCTION
-- ─────────────────────────────────────────────────────────────
-- Generates a random 8-character uppercase alphanumeric string.
-- Used by both the seed data and the admin "Generate 10 codes" button.

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  -- 8 characters from a 32-char alphabet (no 0/O/1/I to avoid confusion)
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

COMMENT ON FUNCTION public.generate_invite_code IS 'Generates an 8-char invite code from uppercase letters + digits, excluding ambiguous chars (0/O/1/I).';


-- ─────────────────────────────────────────────────────────────
-- 5. BATCH GENERATION RPC
-- ─────────────────────────────────────────────────────────────
-- Called from the admin panel to generate N new codes at once.
-- Returns the generated codes as a table.

CREATE OR REPLACE FUNCTION public.generate_invite_codes(count integer DEFAULT 10)
RETURNS TABLE(id uuid, code text, created_at timestamptz) AS $$
DECLARE
  new_code text;
  i integer;
BEGIN
  -- Only super_admin can call this
  IF NOT public.is_current_user_at_least('super_admin') THEN
    RAISE EXCEPTION 'Only super admins can generate invite codes';
  END IF;

  -- Cap at 50 to prevent abuse
  IF count > 50 THEN
    count := 50;
  END IF;

  FOR i IN 1..count LOOP
    -- Generate unique code (retry on collision)
    LOOP
      new_code := public.generate_invite_code();
      BEGIN
        INSERT INTO public.invite_codes (code, created_by)
        VALUES (new_code, auth.uid())
        RETURNING invite_codes.id, invite_codes.code, invite_codes.created_at
          INTO id, code, created_at;
        EXIT; -- Success, move to next code
      EXCEPTION WHEN unique_violation THEN
        -- Collision — try again with a new code
        CONTINUE;
      END;
    END LOOP;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.generate_invite_codes IS 'Generates N unique invite codes (max 50). Super_admin only. Returns the new codes.';


-- ─────────────────────────────────────────────────────────────
-- 6. SEED 20 FRESH CODES
-- ─────────────────────────────────────────────────────────────
-- These are created without a created_by since there's no auth
-- context in the migration. They're "system-generated" codes.

INSERT INTO public.invite_codes (code)
SELECT public.generate_invite_code()
FROM generate_series(1, 20);


-- ─────────────────────────────────────────────────────────────
-- DONE
-- =============================================================
-- Summary:
--   - Wiped old codes, simplified schema to single-use
--   - Added: used_by, used_at, created_by columns
--   - Removed: max_uses, times_used, expires_at, generated_by
--   - Functions: generate_invite_code(), generate_invite_codes(N)
--   - RLS: admin+ SELECT, super_admin INSERT/UPDATE
--   - Seeded 20 fresh 8-char codes
-- =============================================================
