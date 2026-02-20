# Restore Britain Platform — Decisions Log

### Architectural & Strategic Decision Record

> **Purpose:** This document records every significant decision made during the design and development of the platform. Each entry captures what was decided, when, why, and what alternatives were considered or rejected. This prevents relitigating settled questions and provides a clear audit trail of how the platform's architecture evolved.
>
> Decisions are logged in reverse chronological order (newest first).

---

## Decision Format

Each entry follows this structure:
- **Decision:** What was decided
- **Date:** When the decision was made
- **Context:** What problem or question prompted this
- **Reasoning:** Why this option was chosen
- **Alternatives considered:** What else was on the table
- **Impact:** What this decision affects downstream
- **Status:** Active / Superseded / Under review

---

## Active Decisions

### DEC-011: Git version control initialised before any development work
- **Date:** 20 February 2026
- **Context:** Development work was about to begin without version control in place, risking loss of work and inability to track changes.
- **Decision:** Git repository initialised as the very first task in Phase 1.1 — before Supabase setup, before any code. Every phase ends with a commit and push. Remote repository hosted on GitHub or GitLab (private).
- **Reasoning:** Version control is non-negotiable infrastructure. Without it, any failure (accidental deletion, bad code, corrupted files) is unrecoverable. Committing at the end of each phase creates natural checkpoints to roll back to.
- **Alternatives considered:** Starting Git later after initial setup (rejected — even one day of unversioned work is an unnecessary risk).
- **Impact:** Every phase in the goals checklist now ends with a commit-and-push task. `.gitignore` configured before any secrets exist in the project.
- **Status:** Active

### DEC-010: Brand and design to align with existing Restore Britain identity
- **Date:** 20 February 2026
- **Context:** The platform needs a visual identity — colours, logos, fonts, map styling.
- **Decision:** Rather than creating a new brand, the platform will adopt Restore Britain's existing brand guidelines — same colours, logos, and fonts. Brand assets will be stored in a dedicated folder within the project rather than requiring a separate design document.
- **Reasoning:** Consistency with the party's existing identity is more important than a bespoke design. Members should recognise the platform as an official Restore Britain tool immediately. Avoids unnecessary design work.
- **Alternatives considered:** Creating a distinct platform brand (rejected — fragmentation), hiring a designer for a custom identity (rejected — unnecessary cost and delay at this stage).
- **Impact:** Frontend colour palette, typography, logo placement, and map styling all derive from existing party assets. Need to source official brand files from Restore Britain.
- **Status:** Active

### DEC-009: Create a soul.md file for Claude Code / Cowork agent
- **Date:** 20 February 2026
- **Context:** AI-assisted development tools produce better output when given explicit standards and working principles upfront.
- **Decision:** Create a concise soul.md file that defines working standards, response expectations, and values (candour, honesty, thoroughness over shortcuts) for any AI agent working on this project.
- **Reasoning:** Prevents repeated course-correction during development. Sets a consistent quality bar across sessions. Saves hours over the project lifecycle.
- **Alternatives considered:** No soul file, just correct as we go (rejected — inefficient and inconsistent).
- **Impact:** All AI-assisted development work on this project should reference soul.md.
- **Status:** Pending creation

### DEC-008: Maintain a decisions log
- **Date:** 20 February 2026
- **Context:** Multiple significant architectural decisions were being made across a single conversation with no persistent record of the reasoning behind them.
- **Decision:** Create and maintain a DECISIONS.md file logging every significant decision with context, reasoning, and alternatives.
- **Reasoning:** Prevents relitigating settled questions. Provides clarity when returning to the project after a break. Creates accountability for why things are built the way they are.
- **Alternatives considered:** Relying on conversation history (rejected — hard to search, easy to lose context).
- **Impact:** All future decisions should be logged here before implementation.
- **Status:** Active

### DEC-007: Create a goals/checklist file with phased micro-targets
- **Date:** 20 February 2026
- **Context:** The three existing documents (overview, security, database) describe what we're building but not a trackable plan for getting there.
- **Decision:** Create a goals and checklist MD file with an overarching goal, broken into phased micro-goals and a running task list of completed and pending items.
- **Reasoning:** Operational backbone needed to track progress. Without it, the project is a description, not a plan.
- **Alternatives considered:** Tracking tasks informally (rejected — doesn't scale, loses accountability).
- **Impact:** All development work should be tracked against this file. Phase 1 to be defined collaboratively.
- **Status:** Pending creation

### DEC-006: Online Operations and International Outreach as non-geographic departments
- **Date:** 20 February 2026
- **Context:** Not all political organising is tied to physical geography. Digital campaigns, social media coordination, and international relationship-building need a home in the platform.
- **Decision:** Create a "departments" system that functions identically to regions (leaders, quests, forums, Telegram groups) but is not tied to the map. Initial departments: Online Operations, International Outreach (with European Networks and US Relations sub-departments).
- **Reasoning:** Captures digital and international activity within the same quest/gamification framework. Any member can join regardless of location. Keeps the platform relevant for members whose primary contribution is online.
- **Alternatives considered:** Bundling online ops into the national tier (rejected — too vague, no dedicated leadership), separate platform for international work (rejected — fragmentation).
- **Impact:** Departments table in database, department navigation in the UI, department-scoped quests and forums.
- **Status:** Active

### DEC-005: Optional X (Twitter) account linking on member profiles
- **Date:** 20 February 2026
- **Context:** Members may want to connect their X presence to their platform identity for networking and credibility.
- **Decision:** Add an optional X handle field to member profiles. V1 implementation is a simple text field with a link out; verified OAuth linking can be added later.
- **Reasoning:** Low implementation cost, adds social proof and networking value. Optional so it doesn't block registration.
- **Alternatives considered:** OAuth-verified linking from day one (rejected for v1 — adds complexity), no social linking at all (rejected — useful for networking and the online operations department).
- **Impact:** One field on the profiles table. Display on member profile UI with link to X profile.
- **Status:** Active

### DEC-004: National → Regional → Local progression (not 650 constituencies at launch)
- **Date:** 20 February 2026
- **Context:** With realistic early membership numbers (hundreds to low thousands), 650 constituencies would result in most being empty. An empty map undermines confidence and momentum.
- **Decision:** Launch with ~12 regions as the primary organisational unit. Constituencies exist in the database but are not exposed to users. They unlock when regional membership density reaches a threshold — potentially gamified as a recruitment incentive.
- **Reasoning:** 12 regions with even 500 total members means ~40 per region — enough to feel active. 650 constituencies with 2,000 members means ~3 per constituency — feels dead. The map should always feel alive.
- **Alternatives considered:** Launching with all 650 constituencies (rejected — too sparse), launching with only a national tier (rejected — loses the geographic organising power).
- **Impact:** Map shows regions at launch, not constituencies. Database schema pre-built for constituencies. Phased delivery adjusted. Constituency unlock becomes a future feature/gamification element.
- **Status:** Active

### DEC-003: Membership gating — platform restricted to verified Restore Britain members only
- **Date:** 20 February 2026
- **Context:** The platform is an internal organising tool, not a public recruitment site. Open access would invite trolls, infiltrators, and noise.
- **Decision:** Registration requires verified Restore Britain party membership via membership ID + email verification against an authorised list, or via single-use invite codes generated by leaders. No public access whatsoever — even browsing requires authentication.
- **Reasoning:** Keeps the community trusted and focused. Invite codes create accountability chains. Prevents hostile actors from easily accessing campaign planning data.
- **Alternatives considered:** Public access with private areas (rejected — too much surface area), email-only verification (rejected — too weak), manual approval for every registration (rejected — doesn't scale).
- **Impact:** Membership verification table in database, gated registration flow, invite code system, RLS policies tied to is_verified flag.
- **Status:** Active

### DEC-002: Delegate all messaging to Telegram (no custom messaging system)
- **Date:** 20 February 2026
- **Context:** Building end-to-end encrypted messaging, group chat with key rotation, real-time delivery, and offline queuing would be the single most complex and time-consuming component of the platform — months of work producing something inferior to existing solutions.
- **Decision:** All private and group messaging happens on Telegram. The platform provides structured links to Telegram groups at national, regional, departmental, and quest levels. Optional Telegram bot integration pulls activity metrics (not message content) back into the platform.
- **Reasoning:** Telegram already solves messaging at scale with mature security, mobile apps everyone knows, and zero maintenance burden on us. Frees us to focus on what's actually unique — the map, quest system, gamification, and digital parliament structure. Dramatically reduces security scope (no encryption key management, no message storage).
- **Alternatives considered:** Building custom E2E encrypted messaging with libsodium (rejected — massive scope, months of work, ongoing maintenance), using Matrix/Element as self-hosted alternative (rejected — operational complexity of running a Matrix server), using Signal (rejected — no bot API, poor group management features), using Discord (rejected — association with gaming, less credible for political organising).
- **Impact:** Entire messaging layer removed from our build scope. Security document simplified (no E2E encryption to implement). Database schema simplified. Telegram becomes an external dependency with documented fallback plan.
- **Status:** Active

### DEC-001: Drop VPN / censorship resistance infrastructure
- **Date:** 20 February 2026
- **Context:** Initial plan included building or providing a VPN service for all members to ensure the platform couldn't be blocked by UK ISPs, potentially hosted on US east coast servers.
- **Decision:** Drop the VPN entirely. Host the platform on US-based infrastructure (Vercel/Cloudflare) for jurisdictional benefit, but do not provide VPN services to members.
- **Reasoning:** Providing a VPN service means becoming a network infrastructure provider — bringing legal obligations, significant ongoing costs, bandwidth management, and liability. The actual goal (being hard to block) is better achieved by hosting outside UK jurisdiction with alternative domain capability as a quiet contingency. Additionally, heavy censorship resistance infrastructure signals "we have something to hide" when the movement is organising lawful political activity and should signal legitimacy.
- **Alternatives considered:** Full VPN service for all members (rejected — disproportionate scope, cost, and legal complexity), Tor hidden service (rejected — association with illicit activity, poor performance, counterproductive optics), IPFS hosting (rejected — immature for dynamic web apps).
- **Impact:** No VPN infrastructure to build or maintain. Hosting decisions simplified. Security document focused on application-level protections rather than network-level anonymity.
- **Status:** Active

---

## Superseded Decisions

*None yet. When a decision is overturned or replaced, it moves here with a note pointing to the new decision that superseded it.*

---

## How to Use This Document

1. **Before making a new decision**, check if it's already been decided here.
2. **When a decision is made**, add a new entry at the top of the Active Decisions section with the next sequential DEC number.
3. **If a decision is overturned**, move it to the Superseded section and add a note explaining what replaced it and why.
4. **During development**, reference this document when you encounter a "why did we do it this way?" question.

---

*Document version: 0.2 — Added DEC-011 (Git version control)*
*Last updated: February 2026*
*Author: Dennis Stevens & Claude (AI-assisted)*
