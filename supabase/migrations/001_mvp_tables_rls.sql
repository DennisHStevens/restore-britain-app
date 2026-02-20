-- =============================================================
-- Restore Britain Platform — MVP Database Setup
-- Migration 001: Tables, Triggers, RLS Policies, Seed Data
-- =============================================================
-- This migration creates the three MVP tables (regions, profiles,
-- invite_codes), the auto-profile trigger, all RLS policies, and
-- seeds the 12 initial UK regions.
--
-- Run this in the Supabase SQL Editor as the postgres role.
-- =============================================================


-- ----- 1. REGIONS TABLE -----
-- The primary organisational unit at launch. ~12 UK regions.

CREATE TABLE public.regions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  description text,
  telegram_group_url text,
  member_count integer DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Comment explaining the table's purpose
COMMENT ON TABLE public.regions IS 'UK regions — the primary organisational unit at launch. ~12 regions covering England, Scotland, Wales, and Northern Ireland.';


-- ----- 2. PROFILES TABLE -----
-- Extends Supabase Auth. Created automatically via trigger on sign-up.
-- MVP columns only — additional fields (bio, avatar, real_name) added later.

CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL DEFAULT '',
  email           text NOT NULL,
  x_handle        text,
  region_id       uuid REFERENCES public.regions(id),
  postcode_area   text,
  is_verified     boolean DEFAULT false,
  invite_code_used text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Member profiles extending Supabase Auth. One row per registered user, created automatically on sign-up.';


-- ----- 3. INVITE CODES TABLE -----
-- Membership gating system. Leaders/admins generate codes, new users
-- redeem them during registration. All operations go through Edge
-- Functions — the frontend never touches this table directly.

CREATE TABLE public.invite_codes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  generated_by  uuid REFERENCES public.profiles(id),
  max_uses      integer DEFAULT 1,
  times_used    integer DEFAULT 0,
  expires_at    timestamptz,
  created_at    timestamptz DEFAULT now()
);

COMMENT ON TABLE public.invite_codes IS 'Single-use or limited-use invite codes for membership gating. All operations via Edge Functions only.';


-- ----- 4. AUTO-PROFILE TRIGGER -----
-- When a new user signs up via Supabase Auth, automatically create
-- a corresponding row in the profiles table. The profile starts
-- unverified — verification happens during the invite code flow.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    ''  -- Display name is filled during onboarding
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach the trigger to Supabase Auth's users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 'Auto-creates a profiles row when a new auth.users row is inserted. Profile starts unverified.';


-- ----- 5. UPDATED_AT TRIGGER -----
-- Automatically updates the updated_at column on any row modification.

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER regions_updated_at
  BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ----- 6. ENABLE ROW LEVEL SECURITY -----
-- RLS must be enabled on every table. Default is deny-all.

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;


-- ----- 7. HELPER FUNCTION: is_current_user_verified -----
-- Used by RLS policies that need to check verification status.
-- SECURITY DEFINER bypasses RLS, avoiding infinite recursion when
-- this function is called inside a policy on the profiles table.

CREATE OR REPLACE FUNCTION public.is_current_user_verified()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_verified FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.is_current_user_verified IS 'Checks if the currently authenticated user is verified. SECURITY DEFINER bypasses RLS to avoid infinite recursion when used inside RLS policies on the profiles table.';


-- ----- 8. RLS POLICIES — REGIONS -----
-- All authenticated and verified users can read regions.
-- Only the service role can insert/update (admin operations).

CREATE POLICY "Verified members can read regions"
  ON public.regions FOR SELECT
  USING (
    public.is_current_user_verified()
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Only service_role (bypasses RLS) can modify regions.


-- ----- 9. RLS POLICIES — PROFILES -----

-- Users can read their own full profile.
-- Users can read other verified members' public fields only.
-- Users can update their own profile only.

-- Own profile: full access
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Other profiles: only if the reader is verified
-- Uses is_current_user_verified() to avoid infinite recursion.
-- Note: this returns all columns but the frontend should only display
-- public fields. For true column-level restriction we'd need a view,
-- which we can add later. For MVP, RLS ensures you must be verified
-- to see anything at all.
CREATE POLICY "Verified members can read other profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() != id
    AND public.is_current_user_verified()
  );

-- Update own profile only
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ----- 10. RLS POLICIES — INVITE CODES -----
-- No policies for authenticated users at all.
-- All invite code operations go through Edge Functions using the
-- service_role key, which bypasses RLS entirely.
-- This means: anon key queries return zero rows. Exactly what we want.


-- ----- 11. SEED DATA — 12 UK REGIONS -----

INSERT INTO public.regions (name, slug, description, is_active) VALUES
  ('North East',               'north-east',               'North East England — covering Northumberland, Tyne and Wear, County Durham, and the Tees Valley.', true),
  ('North West',               'north-west',               'North West England — covering Greater Manchester, Lancashire, Merseyside, Cheshire, and Cumbria.', true),
  ('Yorkshire & the Humber',   'yorkshire-and-the-humber',  'Yorkshire and the Humber — covering South, West, North, and East Yorkshire, and northern Lincolnshire.', true),
  ('East Midlands',            'east-midlands',            'East Midlands — covering Derbyshire, Leicestershire, Lincolnshire, Northamptonshire, Nottinghamshire, and Rutland.', true),
  ('West Midlands',            'west-midlands',            'West Midlands — covering Birmingham, the Black Country, Coventry, Solihull, Staffordshire, Warwickshire, Herefordshire, Worcestershire, and Shropshire.', true),
  ('East of England',          'east-of-england',          'East of England — covering Bedfordshire, Cambridgeshire, Essex, Hertfordshire, Norfolk, and Suffolk.', true),
  ('London',                   'london',                   'Greater London — all 32 London boroughs and the City of London.', true),
  ('South East',               'south-east',               'South East England — covering Berkshire, Buckinghamshire, Hampshire, Isle of Wight, Kent, Oxfordshire, Surrey, and Sussex.', true),
  ('South West',               'south-west',               'South West England — covering Bristol, Cornwall, Devon, Dorset, Gloucestershire, Somerset, and Wiltshire.', true),
  ('Wales',                    'wales',                    'Wales — all 22 principal areas of Wales, from Anglesey to the Valleys.', true),
  ('Scotland',                 'scotland',                 'Scotland — all 32 council areas of Scotland, from the Borders to the Highlands and Islands.', true),
  ('Northern Ireland',         'northern-ireland',         'Northern Ireland — all 11 district council areas of Northern Ireland.', true);


-- ----- DONE -----
-- Summary of what was created:
--   Tables: regions, profiles, invite_codes
--   Functions: handle_new_user (auto-profile), update_updated_at, is_current_user_verified (RLS helper)
--   Triggers: on_auth_user_created, profiles_updated_at, regions_updated_at
--   RLS: enabled on all 3 tables with policies for profiles and regions
--   Seed data: 12 UK regions
