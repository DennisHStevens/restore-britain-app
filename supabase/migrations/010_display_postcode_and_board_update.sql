-- Migration 010: display_postcode column + board update RLS for super_admin
--
-- 1. Adds display_postcode boolean to profiles (default false).
--    When true, the user's postcode_area is shown as a badge on their
--    posts and comments.
--
-- 2. Adds an RLS policy on boards allowing super_admins to UPDATE
--    the boards table (specifically to edit board descriptions).
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

-- ─── 1. display_postcode column ─────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_postcode boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.display_postcode
  IS 'When true, show the user''s postcode_area as a badge on posts/comments.';

-- ─── 2. Super-admin can UPDATE boards ───────────────────────

-- Allow super_admins to update board rows (e.g. editing description).
-- This complements the existing SELECT policies on boards.
CREATE POLICY "super_admin_update_boards"
  ON public.boards
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );
