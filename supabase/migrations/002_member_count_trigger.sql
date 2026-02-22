/**
 * Migration 002: Automatic member_count maintenance on regions table.
 *
 * Keeps regions.member_count accurate whenever a profile's region_id
 * changes — whether set for the first time (onboarding), changed to a
 * different region, or cleared (set to NULL).
 *
 * How it works:
 * - A BEFORE trigger fires on every INSERT or UPDATE to profiles.
 * - On INSERT: if the new profile has a region_id, increment that region.
 * - On UPDATE: if region_id changed, decrement the old region and
 *   increment the new one. If only one side is non-null, only one
 *   counter changes.
 * - Decrements are clamped to 0 to prevent negative counts if data
 *   was inconsistent for any reason.
 *
 * Why a trigger instead of a view or COUNT(*) query:
 * - member_count is displayed on every bottom-sheet open. A COUNT(*)
 *   on profiles WHERE region_id = X would hit the table on every read.
 * - A trigger keeps the integer pre-computed with zero read overhead.
 * - The trade-off (slightly more complex writes) is worth it for a
 *   column read far more often than it's written.
 *
 * Run this in the Supabase SQL Editor as a privileged role (postgres).
 */

-- The trigger function
CREATE OR REPLACE FUNCTION update_region_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT: new profile with a region
  IF TG_OP = 'INSERT' THEN
    IF NEW.region_id IS NOT NULL THEN
      UPDATE regions
        SET member_count = member_count + 1
        WHERE id = NEW.region_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE: region_id may have changed
  IF TG_OP = 'UPDATE' THEN
    -- Only act if region_id actually changed (or went from/to NULL)
    IF OLD.region_id IS DISTINCT FROM NEW.region_id THEN
      -- Decrement old region (if there was one)
      IF OLD.region_id IS NOT NULL THEN
        UPDATE regions
          SET member_count = GREATEST(member_count - 1, 0)
          WHERE id = OLD.region_id;
      END IF;

      -- Increment new region (if there is one)
      IF NEW.region_id IS NOT NULL THEN
        UPDATE regions
          SET member_count = member_count + 1
          WHERE id = NEW.region_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to profiles
DROP TRIGGER IF EXISTS trg_update_region_member_count ON profiles;

CREATE TRIGGER trg_update_region_member_count
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_region_member_count();

/**
 * Optional: One-time reconciliation query to fix member_count if it has
 * drifted from reality (e.g., if profiles were edited before this
 * trigger existed). Run this once after creating the trigger:
 *
 * UPDATE regions r
 *   SET member_count = COALESCE(sub.cnt, 0)
 *   FROM (
 *     SELECT region_id, COUNT(*) AS cnt
 *     FROM profiles
 *     WHERE region_id IS NOT NULL
 *     GROUP BY region_id
 *   ) sub
 *   WHERE r.id = sub.region_id;
 *
 * -- Also zero out any regions with no members:
 * UPDATE regions
 *   SET member_count = 0
 *   WHERE id NOT IN (
 *     SELECT DISTINCT region_id FROM profiles WHERE region_id IS NOT NULL
 *   );
 */
