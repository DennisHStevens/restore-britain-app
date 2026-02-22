-- Migration 009: Create regional boards for all 12 UK regions
-- See DEC-037: Regional boards + national board pinning
--
-- Creates one board per region, linking via scope_id to the regions table.
-- Also adds a sort_order column to boards so we can explicitly pin the
-- national board at the top without relying on fragile query tricks.

-- Step 1: Add sort_order column (lower = higher in the list)
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;

-- Set the national board to sort_order 0 (always first)
UPDATE public.boards SET sort_order = 0 WHERE scope_type = 'national';

-- Step 2: Insert regional boards (one per region)
-- Each board's slug matches the region's slug for URL consistency.
-- sort_order = 10 for all regional boards (after national at 0).
INSERT INTO public.boards (name, slug, description, scope_type, scope_id, sort_order)
SELECT
  r.name,
  r.slug,
  'Discussion board for Restore Britain members in ' || r.name || '.',
  'region',
  r.id,
  10
FROM public.regions r
WHERE r.is_active = true
  AND NOT EXISTS (
    -- Don't create duplicates if a regional board already exists for this region
    SELECT 1 FROM public.boards b WHERE b.scope_id = r.id
  )
ORDER BY r.name;
