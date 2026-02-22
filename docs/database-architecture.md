# Restore Britain Platform — Database Architecture

### Supabase / PostgreSQL Schema Design (Work In Progress)

> **Companion document to:** *Political WebApp Overview (WIP)* and *Security & Encryption Architecture*
> **Status:** This schema is a working draft designed around the national → regional → local progression model. It will evolve as features are finalised and implementation begins. Nothing here is final.

---

## 1. Design Principles

**Principle 1 — Start lean, extend later.**
We only build tables we need for the current tier of functionality. The schema is designed so that adding the local constituency layer later requires new rows in existing tables, not new tables or structural changes.

**Principle 2 — Row Level Security on everything.**
Every single table has RLS policies enabled from day one. No table is ever accessible without explicit policy rules defining who can read, write, update, and delete. If we forget to add a policy, the default is deny-all — not allow-all.

**Principle 3 — Supabase Auth as the single source of identity.**
All user identity flows through Supabase Auth. Our custom tables reference `auth.users` via foreign keys. We never build our own authentication layer.

**Principle 4 — Soft deletes where possible.**
Records that users or admins "delete" are flagged with a `deleted_at` timestamp rather than being physically removed. This supports moderation review, undo functionality, and audit trails. Actual physical deletion happens via scheduled cleanup jobs respecting UK GDPR retention limits.

**Principle 5 — Timestamps on everything.**
Every table includes `created_at` and `updated_at` columns. These are essential for audit trails, activity feeds, and debugging.

---

## 2. Schema Overview — Table Map

The database is organised into six domains:

| Domain | Tables | Purpose |
|---|---|---|
| **Identity & Auth** | `profiles`, `membership_verification` | User profiles, party membership validation |
| **Geography & Structure** | `regions`, `constituencies`, `departments` | The organisational hierarchy: national → regional → local + online departments |
| **Membership & Roles** | `region_members`, `department_members`, `roles`, `user_roles` | Who belongs where and what permissions they have |
| **Quests & Campaigns** | `quests`, `quest_types`, `quest_participants`, `quest_progress` | The challenge/campaign system with gamification |
| **Forum & Content** | `forum_categories`, `forum_posts`, `forum_replies`, `reactions` | The gated semi-private forum system |
| **Telegram Integration** | `telegram_links`, `telegram_activity` | Links to Telegram groups and optional activity summaries |

---

## 3. Detailed Table Definitions

### 3.1 Identity & Auth

#### `profiles`
Extends Supabase Auth's built-in `auth.users` with platform-specific data. Created automatically via a database trigger when a new user signs up.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, FK → auth.users(id) | Matches the Supabase Auth user ID |
| `display_name` | `text` | NOT NULL, 3-30 chars | Publicly visible name |
| `real_name` | `text` | nullable | Optional, visible only to national admins |
| `email` | `text` | NOT NULL, unique | Mirrors auth.users email |
| `membership_id` | `text` | NOT NULL, unique | Restore Britain party membership number |
| `x_handle` | `text` | nullable | Optional X/Twitter handle (without @) |
| `avatar_url` | `text` | nullable | Profile image URL (Supabase Storage) |
| `bio` | `text` | nullable, max 500 chars | Short personal bio |
| `region_id` | `uuid` | FK → regions(id), nullable | Primary region assignment |
| `postcode_area` | `text` | nullable | First half of postcode (e.g., "BS1"), used for future constituency assignment |
| `onboarded` | `boolean` | DEFAULT false | Has the user completed onboarding? |
| `is_verified` | `boolean` | DEFAULT false | Has membership been verified? |
| `is_suspended` | `boolean` | DEFAULT false | Account suspended by admin? |
| `last_active_at` | `timestamptz` | nullable | Last meaningful platform activity |
| `created_at` | `timestamptz` | DEFAULT now() | Account creation |
| `updated_at` | `timestamptz` | DEFAULT now() | Last profile update |
| `deleted_at` | `timestamptz` | nullable | Soft delete timestamp |

**Notes:**
- `region_id` is nullable because a user might not yet be assigned to a region during onboarding.
- `postcode_area` is stored for future use when we unlock the local constituency layer — it allows us to auto-assign users to constituencies without asking them again.
- `is_verified` is set to true only after membership verification succeeds. Unverified users cannot access any platform features beyond the verification screen.

#### `membership_verification`
Stores the authorised list of Restore Britain members who are allowed to register. Maintained by national admins.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Record ID |
| `membership_id` | `text` | NOT NULL, unique | Official party membership number |
| `registered_email` | `text` | NOT NULL | Email on file with the party |
| `registered_name` | `text` | nullable | Name on file with the party |
| `is_claimed` | `boolean` | DEFAULT false | Has someone registered with this membership ID? |
| `claimed_by` | `uuid` | FK → profiles(id), nullable | Which user claimed this membership |
| `claimed_at` | `timestamptz` | nullable | When it was claimed |
| `created_at` | `timestamptz` | DEFAULT now() | When this record was added |

**Verification flow:**
1. National admin uploads/maintains the membership verification table with valid membership IDs and associated emails.
2. New user enters their membership ID and email during registration.
3. Backend checks: does this membership ID exist? Does the email match? Has it already been claimed?
4. If all checks pass, `is_claimed` is set to true, `claimed_by` is set to the new user's ID, and the user's profile `is_verified` is set to true.
5. If checks fail, registration is rejected with a generic error (we don't reveal whether the ID exists or whether the email was wrong — this prevents enumeration attacks).

**Alternative: Invite Code System**
If the party doesn't yet have a formal membership database, we can replace this with an invite code table:

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Record ID |
| `code` | `text` | NOT NULL, unique | Single-use invite code |
| `generated_by` | `uuid` | FK → profiles(id) | Which leader/admin created this code |
| `max_uses` | `integer` | DEFAULT 1 | How many times this code can be used |
| `times_used` | `integer` | DEFAULT 0 | Current usage count |
| `expires_at` | `timestamptz` | nullable | Optional expiry date |
| `created_at` | `timestamptz` | DEFAULT now() | When the code was generated |

Either system can be active — or both simultaneously during a transition period.

---

### 3.2 Geography & Structure

#### `regions`
The primary organisational unit at launch. Broadly aligned with England's regions plus the devolved nations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Region ID |
| `name` | `text` | NOT NULL, unique | e.g., "West Midlands", "Scotland", "Northern Ireland" |
| `slug` | `text` | NOT NULL, unique | URL-friendly name: "west-midlands" |
| `description` | `text` | nullable | Brief description of the region |
| `map_bounds` | `jsonb` | nullable | Bounding box coordinates for map zoom targeting |
| `telegram_group_url` | `text` | nullable | Link to the regional Telegram group |
| `member_count` | `integer` | DEFAULT 0 | Cached count, updated via trigger |
| `is_active` | `boolean` | DEFAULT true | Is this region currently active on the platform? |
| `created_at` | `timestamptz` | DEFAULT now() | |
| `updated_at` | `timestamptz` | DEFAULT now() | |

**Expected initial regions (~12):**
North East, North West, Yorkshire & the Humber, East Midlands, West Midlands, East of England, London, South East, South West, Wales, Scotland, Northern Ireland.

#### `constituencies`
Prepared for future use but not populated or exposed in v1. Exists in the schema so we don't need structural changes later.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Constituency ID |
| `name` | `text` | NOT NULL | e.g., "Birmingham Edgbaston" |
| `slug` | `text` | NOT NULL, unique | URL-friendly name |
| `region_id` | `uuid` | FK → regions(id) | Which region this constituency belongs to |
| `ons_code` | `text` | unique, nullable | ONS constituency code for GeoJSON matching |
| `mp_name` | `text` | nullable | Current MP (public data) |
| `mp_party` | `text` | nullable | Current MP's party |
| `boundary_geojson` | `jsonb` | nullable | GeoJSON polygon (or reference to external file) |
| `is_unlocked` | `boolean` | DEFAULT false | Has this constituency been activated? |
| `unlocked_at` | `timestamptz` | nullable | When it was activated |
| `member_count` | `integer` | DEFAULT 0 | Cached count |
| `telegram_group_url` | `text` | nullable | |
| `created_at` | `timestamptz` | DEFAULT now() | |
| `updated_at` | `timestamptz` | DEFAULT now() | |

**Note on `boundary_geojson`:** Storing full GeoJSON polygons in the database is viable for 650 constituencies but may be more efficient as static files served from Supabase Storage or a CDN, with only the `ons_code` in the database for lookup. We'll decide during implementation based on performance testing.

#### `departments`
Non-geographic organisational units — the online operations, international outreach, and any future specialist teams.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Department ID |
| `name` | `text` | NOT NULL, unique | e.g., "Online Operations", "European Outreach", "US Relations" |
| `slug` | `text` | NOT NULL, unique | URL-friendly name |
| `description` | `text` | nullable | What this department does |
| `parent_department_id` | `uuid` | FK → departments(id), nullable | Allows nested departments (e.g., "European Outreach" under "International") |
| `telegram_group_url` | `text` | nullable | |
| `member_count` | `integer` | DEFAULT 0 | Cached count |
| `is_active` | `boolean` | DEFAULT true | |
| `created_at` | `timestamptz` | DEFAULT now() | |
| `updated_at` | `timestamptz` | DEFAULT now() | |

**Expected initial departments:**
- Online Operations (digital campaigns, social media coordination)
- International Outreach (parent)
  - European Networks (sub-department)
  - US Relations (sub-department)

---

### 3.3 Membership & Roles

#### `region_members`
Junction table linking users to regions. A user has one primary region but this structure supports future multi-region membership if needed.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Record ID |
| `user_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `region_id` | `uuid` | FK → regions(id), NOT NULL | |
| `is_primary` | `boolean` | DEFAULT true | Is this the user's main region? |
| `joined_at` | `timestamptz` | DEFAULT now() | When they joined this region |
| `left_at` | `timestamptz` | nullable | Soft removal from region |

**Unique constraint:** `(user_id, region_id)` — a user can only be in a region once.

#### `department_members`
Junction table linking users to departments. Users can be in multiple departments.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Record ID |
| `user_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `department_id` | `uuid` | FK → departments(id), NOT NULL | |
| `joined_at` | `timestamptz` | DEFAULT now() | |
| `left_at` | `timestamptz` | nullable | |

**Unique constraint:** `(user_id, department_id)`

#### Roles — Simplified Implementation (DEC-034)

> **Note:** The original design below proposed 6 roles with separate `roles` and `user_roles` tables. After evaluation (DEC-034, 22 Feb 2026), this was simplified to a single `role` text column on the `profiles` table with a 4-tier hierarchy. The separate tables below are **not implemented** — they remain here for reference if future complexity requires them.

**Current implementation (migration 006):**

The `profiles` table has a `role` column:

| Value | Level | Powers |
|---|---|---|
| `member` | 1 | Default. Standard verified member. |
| `commander` | 2 | Moderate posts/comments in their region's board (via `region_id` matching `boards.scope_id`). |
| `admin` | 3 | Moderate all boards globally. Read invite codes. |
| `super_admin` | 4 | All admin powers. Can change user roles. Cannot be demoted. |

Helper functions: `role_level()`, `get_current_user_role()`, `is_current_user_at_least()`, `get_current_user_region_id()`.
Trigger: `protect_role_column` prevents non-super_admins from changing roles and prevents demoting super_admins.

---

<details>
<summary>Original design (not implemented — kept for reference)</summary>

#### `roles`
Defines the available roles in the system. Roles are hierarchical.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Role ID |
| `name` | `text` | NOT NULL, unique | e.g., "national_admin", "regional_leader", "regional_moderator", "department_lead", "member" |
| `display_name` | `text` | NOT NULL | Human-readable: "National Administrator", "Regional Leader" |
| `level` | `integer` | NOT NULL | Hierarchy level: 1 = highest (national admin), 5 = lowest (member) |
| `description` | `text` | nullable | What this role can do |
| `created_at` | `timestamptz` | DEFAULT now() | |

**Expected roles at launch:**
1. `national_admin` (level 1) — Full platform control
2. `national_moderator` (level 2) — Content moderation across all areas
3. `regional_leader` (level 3) — Manages a region: creates quests, moderates forum, manages Telegram links
4. `regional_moderator` (level 4) — Assists regional leader with moderation
5. `department_lead` (level 3) — Same as regional leader but for a department
6. `member` (level 5) — Standard verified member

#### `user_roles`
Junction table assigning roles to users within a specific scope (region, department, or national).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Record ID |
| `user_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `role_id` | `uuid` | FK → roles(id), NOT NULL | |
| `scope_type` | `text` | NOT NULL, CHECK IN ('national', 'region', 'department', 'constituency') | What level this role applies to |
| `scope_id` | `uuid` | nullable | The specific region/department/constituency ID. NULL for national scope. |
| `granted_by` | `uuid` | FK → profiles(id) | Who assigned this role |
| `granted_at` | `timestamptz` | DEFAULT now() | |
| `revoked_at` | `timestamptz` | nullable | Soft revocation |

</details>

---

### 3.4 Quests & Campaigns

#### `quest_types`
Predefined categories of campaigns/challenges.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `name` | `text` | NOT NULL, unique | e.g., "leafleting", "door_knocking", "peaceful_protest", "flag_campaign", "social_media", "recruitment", "custom" |
| `display_name` | `text` | NOT NULL | "Leafleting", "Door Knocking", etc. |
| `icon` | `text` | nullable | Icon identifier for the UI |
| `description` | `text` | nullable | What this type of quest involves |
| `xp_base` | `integer` | DEFAULT 10 | Base XP reward for completing a quest of this type |
| `is_physical` | `boolean` | DEFAULT true | Does this quest involve in-person activity? |
| `created_at` | `timestamptz` | DEFAULT now() | |

#### `quests`
Individual campaigns/challenges created by leaders.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `title` | `text` | NOT NULL, max 120 chars | Quest title |
| `description` | `text` | NOT NULL | Full description and instructions |
| `quest_type_id` | `uuid` | FK → quest_types(id) | Category |
| `scope_type` | `text` | NOT NULL, CHECK IN ('national', 'region', 'department', 'constituency') | Where this quest applies |
| `scope_id` | `uuid` | nullable | Specific region/department/constituency. NULL for national. |
| `created_by` | `uuid` | FK → profiles(id) | Leader who created it |
| `status` | `text` | DEFAULT 'active', CHECK IN ('draft', 'active', 'completed', 'cancelled') | Quest lifecycle state |
| `location_name` | `text` | nullable | Human-readable location for physical quests |
| `location_lat` | `decimal` | nullable | Latitude for map pin |
| `location_lng` | `decimal` | nullable | Longitude for map pin |
| `starts_at` | `timestamptz` | nullable | When the quest begins |
| `ends_at` | `timestamptz` | nullable | Deadline |
| `target_participants` | `integer` | nullable | Goal number of participants |
| `target_metric` | `text` | nullable | e.g., "500 leaflets distributed", "100 doors knocked" |
| `target_metric_value` | `integer` | nullable | Numeric target |
| `current_metric_value` | `integer` | DEFAULT 0 | Current progress (cached, updated via triggers) |
| `xp_reward` | `integer` | NOT NULL | XP awarded on completion |
| `resource_urls` | `jsonb` | nullable | Array of attached resources: leaflet PDFs, maps, talking points |
| `telegram_group_url` | `text` | nullable | Dedicated Telegram group for this quest if applicable |
| `participant_count` | `integer` | DEFAULT 0 | Cached count |
| `created_at` | `timestamptz` | DEFAULT now() | |
| `updated_at` | `timestamptz` | DEFAULT now() | |

#### `quest_participants`
Tracks who has joined/completed each quest.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `quest_id` | `uuid` | FK → quests(id), NOT NULL | |
| `user_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `status` | `text` | DEFAULT 'accepted', CHECK IN ('accepted', 'in_progress', 'completed', 'dropped') | |
| `evidence_url` | `text` | nullable | Photo/proof of completion (Supabase Storage URL) |
| `evidence_note` | `text` | nullable | Optional note on what they did |
| `metric_contribution` | `integer` | nullable | How much they contributed to the target metric |
| `completed_at` | `timestamptz` | nullable | |
| `xp_awarded` | `integer` | DEFAULT 0 | XP actually awarded (may differ from base if bonuses apply) |
| `created_at` | `timestamptz` | DEFAULT now() | |
| `updated_at` | `timestamptz` | DEFAULT now() | |

**Unique constraint:** `(quest_id, user_id)` — one participation record per user per quest.

#### `quest_progress`
Optional: granular progress updates for longer quests. Allows members to log incremental progress.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `quest_id` | `uuid` | FK → quests(id), NOT NULL | |
| `user_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `note` | `text` | nullable | What they did in this update |
| `metric_increment` | `integer` | nullable | e.g., "distributed 50 leaflets" |
| `photo_url` | `text` | nullable | Progress photo |
| `created_at` | `timestamptz` | DEFAULT now() | |

---

### 3.5 Forum & Content

#### `forum_categories`
Predefined discussion categories. Scoped to either national, a region, or a department.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `name` | `text` | NOT NULL | e.g., "General Discussion", "Campaign Planning", "Local News" |
| `slug` | `text` | NOT NULL | |
| `description` | `text` | nullable | |
| `scope_type` | `text` | NOT NULL, CHECK IN ('national', 'region', 'department') | |
| `scope_id` | `uuid` | nullable | NULL for national |
| `sort_order` | `integer` | DEFAULT 0 | Display ordering |
| `is_locked` | `boolean` | DEFAULT false | Prevent new posts? |
| `created_at` | `timestamptz` | DEFAULT now() | |

#### `forum_posts`
Top-level discussion threads.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `category_id` | `uuid` | FK → forum_categories(id), NOT NULL | |
| `author_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `title` | `text` | NOT NULL, max 200 chars | |
| `body` | `text` | NOT NULL | Post content (sanitised HTML or markdown) |
| `is_pinned` | `boolean` | DEFAULT false | Pinned to top of category |
| `is_locked` | `boolean` | DEFAULT false | Prevent new replies |
| `reply_count` | `integer` | DEFAULT 0 | Cached |
| `last_reply_at` | `timestamptz` | nullable | For sorting by activity |
| `reaction_count` | `integer` | DEFAULT 0 | Cached total reactions |
| `created_at` | `timestamptz` | DEFAULT now() | |
| `updated_at` | `timestamptz` | DEFAULT now() | |
| `deleted_at` | `timestamptz` | nullable | Soft delete |

#### `forum_replies`
Replies to forum posts. Flat structure (not nested) for v1 simplicity.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `post_id` | `uuid` | FK → forum_posts(id), NOT NULL | |
| `author_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `body` | `text` | NOT NULL | |
| `reply_to_id` | `uuid` | FK → forum_replies(id), nullable | Optional: which reply this is responding to (for @mention context, not full nesting) |
| `reaction_count` | `integer` | DEFAULT 0 | Cached |
| `created_at` | `timestamptz` | DEFAULT now() | |
| `updated_at` | `timestamptz` | DEFAULT now() | |
| `deleted_at` | `timestamptz` | nullable | |

#### `reactions`
Simple reaction system for posts and replies. Keeps engagement lightweight.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `target_type` | `text` | NOT NULL, CHECK IN ('post', 'reply') | What's being reacted to |
| `target_id` | `uuid` | NOT NULL | ID of the post or reply |
| `reaction_type` | `text` | NOT NULL, CHECK IN ('like', 'support', 'fire') | Keep it simple — 3 reaction types max at launch |
| `created_at` | `timestamptz` | DEFAULT now() | |

**Unique constraint:** `(user_id, target_type, target_id, reaction_type)` — one reaction of each type per user per target.

---

### 3.6 Gamification

#### `user_stats`
Aggregated gamification metrics per user. Updated via database triggers when quests are completed or other tracked actions occur.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | `uuid` | PK, FK → profiles(id) | |
| `total_xp` | `integer` | DEFAULT 0 | Lifetime XP earned |
| `current_level` | `integer` | DEFAULT 1 | Derived from XP thresholds |
| `quests_completed` | `integer` | DEFAULT 0 | Total quests finished |
| `quests_accepted` | `integer` | DEFAULT 0 | Total quests joined |
| `forum_posts` | `integer` | DEFAULT 0 | Total forum posts + replies |
| `current_streak` | `integer` | DEFAULT 0 | Consecutive days with platform activity |
| `longest_streak` | `integer` | DEFAULT 0 | All-time best streak |
| `last_activity_date` | `date` | nullable | For streak calculation |
| `updated_at` | `timestamptz` | DEFAULT now() | |

**XP Level Thresholds (configurable):**
These would be stored in a `level_thresholds` config table or as application constants:
- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 300 XP
- Level 4: 600 XP
- Level 5: 1000 XP
- ...and so on, scaling progressively

#### `achievements`
Definable badges/milestones that members can unlock.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `name` | `text` | NOT NULL, unique | e.g., "First Quest", "Door Warrior", "Regional Champion" |
| `description` | `text` | NOT NULL | What you did to earn this |
| `icon` | `text` | nullable | Icon/badge identifier |
| `xp_bonus` | `integer` | DEFAULT 0 | Bonus XP awarded with this achievement |
| `criteria` | `jsonb` | NOT NULL | Machine-readable unlock conditions, e.g., {"quests_completed": 10, "quest_type": "door_knocking"} |
| `created_at` | `timestamptz` | DEFAULT now() | |

#### `user_achievements`
Junction table tracking which users have earned which achievements.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `uuid` | FK → profiles(id), NOT NULL | |
| `achievement_id` | `uuid` | FK → achievements(id), NOT NULL | |
| `earned_at` | `timestamptz` | DEFAULT now() | |

**Unique constraint:** `(user_id, achievement_id)`

---

### 3.7 Telegram Integration

#### `telegram_links`
Maps platform entities (regions, departments, quests) to their Telegram groups.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `scope_type` | `text` | NOT NULL, CHECK IN ('national', 'region', 'department', 'constituency', 'quest') | |
| `scope_id` | `uuid` | nullable | NULL for national |
| `telegram_url` | `text` | NOT NULL | Invite link to the Telegram group |
| `telegram_chat_id` | `text` | nullable | Telegram's internal chat ID (for bot API integration) |
| `display_name` | `text` | NOT NULL | What to show in the UI |
| `is_active` | `boolean` | DEFAULT true | |
| `created_at` | `timestamptz` | DEFAULT now() | |
| `updated_at` | `timestamptz` | DEFAULT now() | |

#### `telegram_activity`
Optional: if we implement a Telegram bot that reports activity summaries back to our platform.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `telegram_link_id` | `uuid` | FK → telegram_links(id), NOT NULL | |
| `message_count_24h` | `integer` | DEFAULT 0 | Messages in last 24 hours |
| `active_members_24h` | `integer` | DEFAULT 0 | Unique posters in last 24 hours |
| `last_activity_at` | `timestamptz` | nullable | |
| `snapshot_at` | `timestamptz` | DEFAULT now() | When this snapshot was taken |

---

## 4. Key Database Triggers & Functions

These PostgreSQL functions run automatically to keep cached counts accurate and handle lifecycle events.

### 4.1 Auto-Create Profile on Sign Up
```sql
-- Trigger: after INSERT on auth.users
-- Creates a corresponding row in profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, membership_id)
  VALUES (
    NEW.id,
    NEW.email,
    '', -- Filled during onboarding
    '' -- Filled during verification
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 Update Region Member Count
```sql
-- Trigger: after INSERT or UPDATE on region_members
-- Recalculates the cached member_count on the regions table
```

### 4.3 Update Quest Progress
```sql
-- Trigger: after INSERT or UPDATE on quest_participants
-- Updates quest.participant_count and quest.current_metric_value
-- Checks if quest target has been met and auto-completes if so
```

### 4.4 Award XP on Quest Completion
```sql
-- Trigger: after UPDATE on quest_participants WHERE status = 'completed'
-- Adds XP to user_stats.total_xp
-- Recalculates current_level
-- Checks achievement criteria and awards any newly unlocked achievements
```

### 4.5 Update Streak
```sql
-- Trigger: on meaningful activity (quest action, forum post)
-- Checks if last_activity_date was yesterday → increment streak
-- If last_activity_date was before yesterday → reset streak to 1
-- Updates longest_streak if current exceeds it
```

---

## 5. Row Level Security — Policy Overview

Every table has RLS enabled. Here's the access model:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Own profile: full. Others: display_name, avatar, bio, xp, level only | Auto (trigger) | Own profile only | National admin only (soft delete) |
| `membership_verification` | National admin only | National admin only | System only (on claim) | National admin only |
| `regions` | All verified members | National admin only | National admin only | Never |
| `region_members` | Members of that region + admins | Self (join) + admins | Admins only | Self (leave) + admins |
| `quests` | Members of the quest's scope | Leaders of that scope | Creator + admins | Creator + admins (soft) |
| `quest_participants` | Participant (own) + quest creator + admins | Self (accept quest) | Self (update progress) + admins | Self (drop quest) |
| `forum_posts` | Members of that forum's scope | Verified members of that scope | Author (own, within edit window) + mods | Author (soft) + mods (soft) |
| `forum_replies` | Members of that forum's scope | Verified members of that scope | Author (within edit window) + mods | Author (soft) + mods (soft) |
| `user_stats` | Own: full. Others: xp, level, quests_completed only | System only (trigger) | System only (trigger) | Never |

---

## 6. Indexing Strategy

Performance-critical queries need proper indexes:

```sql
-- Fast lookup of users by region
CREATE INDEX idx_region_members_region ON region_members(region_id) WHERE left_at IS NULL;

-- Fast lookup of active quests by scope
CREATE INDEX idx_quests_scope ON quests(scope_type, scope_id) WHERE status = 'active';

-- Forum posts sorted by recent activity
CREATE INDEX idx_forum_posts_activity ON forum_posts(category_id, last_reply_at DESC) WHERE deleted_at IS NULL;

-- User stats leaderboard
CREATE INDEX idx_user_stats_xp ON user_stats(total_xp DESC);

-- Membership verification lookup (used during registration)
CREATE INDEX idx_membership_lookup ON membership_verification(membership_id, registered_email) WHERE is_claimed = false;
```

---

## 7. Data Retention & GDPR

- **Active accounts:** Data retained indefinitely while account is active.
- **Deleted accounts:** Soft deleted immediately. Personal data (real_name, email, postcode_area) hard-deleted after 30 days. Display name and public contributions (forum posts, quest completions) are anonymised but retained for continuity.
- **Membership verification records:** Retained as long as the corresponding account exists. Unclaimed records have no personal data concern (they contain only the membership ID and email the party already holds).
- **Right to export:** Users can request a full export of their data (profile, posts, quest history, stats) in JSON format.
- **Right to erasure:** Users can request full deletion. We comply within 30 days per UK GDPR.

---

## 8. Migration Path — Adding the Local Constituency Layer

When the platform reaches sufficient membership density to justify local organisation, the constituency layer activates with minimal schema changes:

1. Populate `constituencies` table with boundary data and ONS codes.
2. Add a `constituency_members` junction table (identical structure to `region_members`).
3. Use `postcode_area` from `profiles` to suggest constituency assignment.
4. Extend the `scope_type` CHECK constraints to include 'constituency' in quests and forums (already present in the schema).
5. Add `constituency_leader` and `constituency_moderator` to the roles table.
6. Add Telegram links for constituency groups.

No existing tables need modification. The schema is pre-designed for this extension.

---

*Document version: 0.1 — Initial draft*
*Last updated: February 2026*
*Author: Dennis Stevens & Claude (AI-assisted)*
