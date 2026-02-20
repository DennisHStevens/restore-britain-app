# Restore Britain — Digital Ground Game Platform

### Political WebApp Overview (Work In Progress)

> **Status:** This document is a living overview and remains a work in progress. It will require further delineation, user feedback, and architectural refinement before we produce a concrete step-by-step implementation plan. Nothing here is final — everything is open to revision.
> 
> **Companion documents:**
> - *Security & Encryption Architecture* — covers all security protocols, threat modelling, and implementation details
> - *Database Architecture* — covers the full Supabase/PostgreSQL schema, RLS policies, and data model

---

## 1. Vision & Purpose

This platform exists to solve a specific problem: political movements in Britain have no effective digital infrastructure for coordinating real-world, on-the-ground action at scale. Social media is useful for reach but terrible for organisation. Group chats collapse under their own weight. There is no system that maps the physical reality of British political geography onto a digital tool purpose-built for local coordination.

We are building a **Progressive Web App (PWA)** — a website that behaves indistinguishably from a native phone app — that serves as the operational backbone for Restore Britain's ground game. It is not a social media platform. It is a **digital parliament and campaign coordination system** where every region has leadership, every leader can issue campaigns, and every verified member can see exactly what is happening in their area and how to get involved.

The platform is **members-only** — gated behind Restore Britain party membership verification. It is not open to the public. This is an internal organising tool for committed members, not a recruitment website.

The platform must feel premium, fast, and native on mobile devices. It must be secure enough that organisational data is protected against any realistic threat. And it must be simple enough that someone with no technical background can open it, find their region, and start contributing within minutes.

---

## 2. Core Design Philosophy

### 2.1 Mobile-First, Native Feel

This is a phone app that happens to live in a browser. Every design decision flows from this. The PWA will support:

- **Fullscreen mode** via the Web App Manifest, eliminating the browser chrome entirely when launched from the home screen
- **Smooth, gesture-based navigation** — pinch-to-zoom, swipe transitions, pull-to-refresh, all with hardware-accelerated animations
- **Offline capability** via service workers — the map, cached regional data, and recent forum posts should remain accessible without signal
- **Add to Home Screen** prompts, giving users an app icon on their phone indistinguishable from a native app
- **Push notifications** (via the Push API) for campaign alerts, quest updates, and announcements
- **Responsive but mobile-primary** — desktop access will work but is not the priority; every screen is designed for a 375px–430px viewport first

### 2.2 Speed & Performance

The app must load fast on mid-range phones over average UK mobile data. This means:

- Aggressive code splitting — only load what the user is looking at
- Map tiles and GeoJSON boundary data cached locally after first load
- Skeleton screens and optimistic UI updates so nothing ever feels like it's "loading"
- Target: First Contentful Paint under 1.5 seconds, Time to Interactive under 3 seconds on 4G

### 2.3 Simplicity Over Feature Creep

Every feature must justify its existence by answering: **does this help someone organise or participate in real-world political action?** If the answer is unclear, it doesn't ship in v1.

### 2.4 National → Regional → Local Progression

The platform launches with **national and regional** organisation. We do not pretend to have 650 active constituency chapters on day one. With even 2,000 members spread across 650 constituencies, most would be empty — and an empty map kills momentum.

Instead, we start with approximately 12 regions that feel alive and active, and unlock local constituency chapters as membership density grows. This means:

- The map shows **regions** as the primary interactive unit at launch
- **Constituencies exist in the database** and the map data is ready, but they are not exposed to users until activated
- Activation criteria: when a region reaches sufficient members, it subdivides into its constituent constituencies — this can even be gamified as a recruitment incentive ("Help your region unlock local chapters!")
- This approach ensures the platform always feels buzzing rather than deserted

---

## 3. Platform Architecture — The Six Layers

### 3.1 Layer 1: The Interactive Map (The Centrepiece)

The map is the heart of the application. When a user opens the platform, they see Great Britain and Northern Ireland rendered as an interactive, zoomable map divided into regions.

**Boundary Data:**
- **At launch:** ~12 regions displayed as interactive polygons (broadly matching England's regions plus Scotland, Wales, Northern Ireland)
- **Future unlock:** 650 parliamentary constituencies nested within regions, toggled on per-region when membership density justifies it
- GeoJSON boundary data sourced from the Office for National Statistics (ONS) Open Geography Portal and Ordnance Survey open data
- Constituency boundaries aligned to current (2024 boundary review) lines, pre-loaded in the database for when they're needed

**Map Technology:**
- **MapLibre GL JS** — open-source, WebGL-accelerated, handles complex GeoJSON rendering with smooth 60fps performance on mobile
- Custom map styling to match the platform's brand identity — not a generic Google Maps look
- Regions colour-coded by status: active with leadership, needs a leader, campaign in progress

**Interaction Model:**
- Pinch-to-zoom and pan with momentum/inertia (native-feeling touch physics)
- Tap on any region to open its detail view
- Long-press for a quick-preview tooltip showing region name, leader name, and active campaign count
- Search bar overlay to find a region by name or postcode
- "Find My Region" button using the device's geolocation API
- Smooth animated transitions when zooming into a region detail view
- When constituencies are unlocked within a region, zooming in further reveals constituency boundaries

**Data Integration:**
- Each region polygon links to a region record in the database
- Real-time overlay data: number of active members, current campaigns, recent activity — pulled from Supabase and rendered as visual indicators on the map

### 3.2 Layer 2: Region & Constituency Detail View

When a user taps on a region, the map smoothly zooms in and a detail panel slides up from the bottom (mobile sheet pattern). This is the operational hub for that region.

**Region Profile:**
- Region name and description
- Regional Leader — the Restore Britain organiser for this area
- Leader's bio and contact method (via Telegram)
- Member count for this region
- Link to the regional Telegram group
- A "Join This Region" button (auto-suggested based on postcode during onboarding)

**Active Quests / Campaigns:**
- A quest is a specific, time-bound action issued by the regional leader
- Examples: "Leaflet 500 homes in [area] by [date]", "Attend peaceful protest at [location] on [date]", "Door-knock [street/estate] this Saturday"
- Each quest has: title, description, type, start date, end date, location, target metrics, current progress, XP reward
- Members can "Accept" a quest and report completion with optional photo evidence
- Progress bars showing how close the region is to completing each quest
- Completed quests archived with results

**Campaign Types (predefined categories):**
- Peaceful Protest — location, time, expected attendance, logistical notes
- Door Knocking — target area, talking points provided, sign-up slots
- Leafleting — area map, leaflet design (downloadable PDF), distribution targets
- Flag Campaigns — locations, materials needed, coordination details
- Social Media — coordinated online campaigns (hashtags, content templates, timing)
- Recruitment — membership drive targets and resources
- Custom — leader-defined campaigns that don't fit the above

**Contacts & Resources:**
- Key contacts within the region (leaders, deputies, specialists)
- Relevant local resources: meeting venues, print shops, sympathetic local businesses
- Links to relevant local news or political context

### 3.3 Layer 3: Communication — Telegram Integration

All organised group communication happens on **Telegram**, not within the platform. We delegate messaging to Telegram because it already handles group management, media sharing, and scales to any size — building our own messaging system would take months and produce an inferior result.

**How it works:**

The platform provides structured links to Telegram groups at every level:

- **National Telegram group** — all members, national announcements and discussion
- **Regional Telegram groups** — one per active region, for local coordination
- **Quest-specific Telegram groups** — optional, for coordinating specific campaigns
- **Department Telegram groups** — for online operations and international outreach teams
- **Future: Constituency Telegram groups** — activated when the local layer unlocks

Members tap "Join Chat" on any region, department, or quest page and are taken directly to the appropriate Telegram group.

**Telegram Bot Integration (optional, post-launch):**
- A Telegram bot sitting in each group can report activity summaries back to the platform via the Telegram Bot API
- Metrics pulled: message count (24h), active members (24h), last activity timestamp
- These feed into the map overlays and dashboards, showing which regions are most active
- The bot does not relay message content — only aggregate activity metrics

**What this means for security:**
- We do not store any message content. Telegram handles all messaging data.
- Private conversations between members happen on Telegram, governed by Telegram's own encryption and privacy policies.
- Members should be aware that standard Telegram groups use server-side encryption (Telegram can read them). For genuinely sensitive one-to-one conversations, members should use Telegram's Secret Chat feature, which is fully end-to-end encrypted.
- See the Security Architecture document for a full discussion of the trade-offs of delegating to Telegram.

### 3.4 Layer 4: Forum System (Gated, Semi-Private)

Alongside Telegram for real-time chat, the platform hosts its own **forum system** for structured, searchable, persistent discussion. Unlike Telegram messages which scroll past and get buried, forum posts remain findable and organised.

**Structure:**
- Forums are scoped to **national**, **regional**, or **departmental** level
- Each scope has predefined categories: General Discussion, Campaign Planning, Local News, Questions for Leadership
- Threaded discussions: a post with a title and body, followed by flat replies
- Only verified members can view or post — the forum is invisible to non-members

**Features:**
- Posts support text, images, and links (all sanitised server-side)
- Leaders can pin posts, lock threads, and moderate content
- Simple reaction system (like, support, fire) for lightweight engagement
- Posts sorted by recent activity — active discussions rise to the top
- Search functionality across all forums the member has access to

**Moderation:**
- Regional leaders and national moderators can remove posts, mute users, and lock threads
- Automated moderation (profanity filters, spam detection) considered for post-launch
- All moderation actions are logged for accountability

### 3.5 Layer 5: Online Operations & International Department

Not all organising is geographic. The platform includes **non-geographic departments** for digital campaigns and international outreach.

**Online Operations Department:**
- Coordinating social media campaigns, content creation, and digital activism
- Social media quest types: coordinated posting, hashtag campaigns, content templates
- Operates independently of regional geography — any member can join regardless of location
- Has its own forum categories, quest system, leadership structure, and Telegram group

**International Outreach Department:**
- A parent department with sub-departments for specific regions:
  - **European Networks** — connecting with aligned nationalist movements across Europe, sharing strategies, building solidarity
  - **US Relations** — engaging with sympathetic movements and supporters in the United States
- Each sub-department has its own leadership, forum, quests (focused on digital outreach, relationship-building, and cross-border coordination), and Telegram groups
- Quests in this department are inherently digital — coordinated messaging, event cross-promotion, and strategic alliance-building

**How departments fit the structure:**
Departments work identically to regions in terms of features — they have leaders, members, quests, forums, Telegram links, and appear in the gamification system. The only difference is they are not tied to a geographic area on the map. They are accessed via a dedicated "Departments" section in the app navigation, separate from the map.

### 3.6 Layer 6: The Digital Parliament (Governance, Gamification & Dashboards)

This is what elevates the platform beyond a simple organising tool into a genuine operational infrastructure.

**Hierarchical Structure:**
- **National Leadership** — platform administrators, set national strategy and campaigns
- **Regional Leaders** — manage a region: create quests, moderate forum, manage Telegram links, report upward
- **Department Leads** — same as regional leaders but for online/international departments
- **Members** — the grassroots participants who accept quests, attend events, and contribute

**Gamification:**
- **XP (Experience Points)** earned by completing quests, posting on forums, maintaining activity streaks
- **Levels** that increase with XP — providing a visible sense of progression
- **Achievements/Badges** for specific milestones: "First Quest", "Door Warrior" (10 door-knocking quests), "Regional Champion" (most XP in a region)
- **Streaks** — consecutive days of platform activity, encouraging daily engagement
- **Regional leaderboards** — top contributors per region, fostering healthy competition
- Gamification serves the mission — every XP-earning action corresponds to real-world political activity. It is not engagement for engagement's sake.

**Leader Dashboard:**
- Regional leaders get a dedicated dashboard showing: member activity, quest completion rates, engagement trends, upcoming events
- Ability to create and manage quests, post to the regional forum, send announcements
- View neighbouring regions' public activity to coordinate cross-boundary campaigns

**National Dashboard:**
- Aggregate view of all regional activity across the UK
- Heatmap overlay on the main map showing activity density
- National campaign creation that cascades down to relevant regions
- Analytics: total members, total quests completed, geographic coverage, growth trends

**Member Profiles:**
- Display name, optional X handle (linked to their profile), region, department memberships, join date
- XP, level, achievements, quests completed, current streak
- Profiles are visible to other verified members within the same scopes

---

## 4. Membership Verification & Onboarding

The platform is **closed to non-members.** Access requires verified Restore Britain party membership.

**Verification Methods (one or both active):**

**Method 1 — Membership ID Verification:**
- The party maintains a membership database with membership IDs and associated emails
- During registration, the user enters their membership ID and email
- The backend checks these against the authorised list
- Match → verified. No match → registration rejected with a generic error (preventing enumeration attacks)

**Method 2 — Invite Code System:**
- For situations where a formal membership database doesn't yet exist or for supplementary verification
- Verified leaders and admins generate single-use (or limited-use) invite codes
- New users enter their code during registration
- Codes are tied to the leader who generated them, creating an accountability chain

**Onboarding Flow:**
1. User visits the site or opens the PWA
2. Sees a branded, gated landing page — no platform content is visible
3. Taps "Register" and enters membership ID + email (or invite code)
4. Verification passes → creates account with display name, password, optional X handle
5. Enters postcode → automatically assigned to their region
6. Sees their region detail view: leader, active quests, Telegram link, forum
7. Prompted to accept their first quest or introduce themselves in the forum
8. Prompted to add the app to their home screen

---

## 5. Technical Stack (Proposed)

| Component | Technology | Rationale |
|---|---|---|
| Frontend Framework | **React** (via Next.js or Vite) | Component-based, massive ecosystem, excellent PWA tooling |
| Map Engine | **MapLibre GL JS** | Open-source, WebGL-accelerated, superior mobile touch handling |
| Boundary Data | **ONS / OS Open GeoJSON** | Authoritative, freely available UK political boundary data |
| Backend / Database | **Supabase** (PostgreSQL) | Real-time subscriptions, Row Level Security, auth built-in |
| Authentication | **Supabase Auth** | Email/password, magic links, optional TOTP 2FA |
| Messaging | **Telegram** (external) | Delegated — platform links to TG groups, optional Bot API for activity metrics |
| Push Notifications | **Web Push API + Service Worker** | Native-feeling notifications without app store distribution |
| Hosting | **Vercel or Cloudflare Pages** | Edge-deployed, fast globally, DDoS protection, generous free tiers |
| File Storage | **Supabase Storage** | For leaflet PDFs, campaign images, profile photos |
| PWA Tooling | **Workbox (by Google)** | Industry-standard service worker and caching management |
| Telegram Bot | **Telegram Bot API** (Node.js) | Optional post-launch: pulls activity summaries from TG groups |

Full database schema, table definitions, RLS policies, and data model are documented in the companion *Database Architecture* document.

---

## 6. User Journeys (Key Flows)

### 6.1 New Member Onboarding
1. User visits the site (or opens PWA from home screen)
2. Sees a branded, gated landing page — no content visible without login
3. Taps "Register" and enters membership ID + email (or invite code)
4. Verification passes → creates account with display name, password, optional X handle
5. Enters postcode → automatically assigned to their region
6. Sees their region detail view: leader, active quests, Telegram link, forum
7. Prompted to accept their first quest or introduce themselves in the forum
8. Prompted to add the app to their home screen

### 6.2 Regional Leader Creating a Campaign
1. Leader opens their dashboard
2. Taps "Create New Quest"
3. Selects campaign type (protest / leafleting / door-knocking / flag / social media / recruitment / custom)
4. Fills in details: title, description, location, dates, targets, XP reward
5. Optionally attaches resources (leaflet PDF, map, talking points)
6. Optionally creates or links a dedicated Telegram group for this quest
7. Publishes — quest appears on the region page and push notifications fire to members
8. Monitors progress as members accept and report completion

### 6.3 National Campaign Cascade
1. National leadership creates a national campaign (e.g., "National Leafleting Day")
2. Campaign appears as a suggested quest template for all regional leaders
3. Each leader can adopt the template and customise it for their region
4. National dashboard shows aggregate progress across all participating regions
5. Leaders share approaches and results in the national forum

### 6.4 Member Completing a Quest
1. Member sees an active quest on their region page
2. Taps "Accept Quest" — status updates to accepted, XP reward shown
3. Attends the event or completes the task in the real world
4. Returns to the app and taps "Report Completion"
5. Optionally uploads a photo and adds a note about what they did
6. Leader reviews and approves (or auto-approved for certain quest types)
7. XP awarded, achievement checks triggered, streak updated
8. Progress bar on the quest updates for all members to see

---

## 7. Data Requirements

### 7.1 Data We Must Source
- Accurate GeoJSON boundaries for ~12 regions (at launch) and all 650 parliamentary constituencies (pre-loaded for future use)
- Current MP data per constituency (available from Parliament's open data API)
- Postcode-to-region lookup data (ONS Postcode Directory)

### 7.2 Data We Must Generate
- Regional leader profiles (recruited by Restore Britain)
- Campaign content and quest definitions (created by leaders)
- Forum content (generated by members)
- Member profiles and activity records

### 7.3 Data We Must Protect
- Member personal information (email, postcode, real name if provided)
- Membership verification records
- Campaign planning details that may be tactically sensitive
- Leader contact information beyond what they choose to make public
- Authentication credentials and session tokens

Full data classification, encryption tiers, and protection mechanisms are documented in the companion *Security & Encryption Architecture* document.

---

## 8. Open Questions & Decisions Still Required

These items need resolution before we can produce a step-by-step implementation plan:

1. **Identity verification strength** — Is membership ID + email sufficient, or do we want additional verification (phone number, manual approval by a leader)? This affects how resistant the system is to infiltration.

2. **Leader appointment process** — How are regional leaders selected? Self-nomination, appointment by national leadership, election by regional members? This affects the governance features we need to build.

3. **Content moderation policy** — Who moderates the forums and on what basis? Do we need automated moderation (profanity filters, spam detection) or is manual moderation by leaders sufficient at launch?

4. **Legal considerations** — Electoral law in the UK has specific rules about political campaigning, data protection (UK GDPR), and coordination of campaign spending. We should understand what obligations apply before launch.

5. **Scalability targets** — Are we designing for 500 members at launch or 5,000? This affects infrastructure decisions and how many regions should be active from day one.

6. **Branding and visual identity** — Colours, typography, iconography, and map styling all need defining before UI development begins.

7. **Revenue / funding model** — Is this funded by Restore Britain centrally, by donations, by membership fees, or is it volunteer-run? This affects hosting decisions and long-term sustainability.

8. **Telegram group management** — Who creates and manages the Telegram groups? Are they created automatically by the platform or manually by leaders? How do we handle moderation across both the platform forum and Telegram?

9. **International department scope** — How active is the international outreach at launch? Is this a v1 feature or something layered on after the domestic platform is solid?

10. **Accessibility** — What level of accessibility compliance are we targeting? WCAG 2.1 AA should be the minimum for a public-facing political platform.

---

## 9. Phased Delivery (Rough Outline)

> This is not the implementation plan — that will be produced after this overview is finalised. This is a rough indication of how we'd sequence the build.

**Phase 1 — The Map & PWA Shell (Foundation)**
- PWA shell with fullscreen, home screen install, service worker
- Interactive map of the UK with regional boundaries
- Tap-to-view region name and basic info
- Postcode lookup / geolocation to find your region
- No accounts, no database — purely a polished, fast, interactive map

**Phase 2 — Accounts, Verification & Region Profiles**
- Supabase integration: auth, database, Row Level Security
- Membership verification system (membership ID or invite codes)
- Member registration and region assignment via postcode
- Region detail view with leader info and description
- Basic member profiles with optional X handle linking

**Phase 3 — Quests & Gamification**
- Quest creation system for regional leaders
- Quest acceptance and progress tracking for members
- Campaign type templates (protest, leafleting, door-knocking, flag, social media, recruitment)
- XP system, levels, achievements, streaks
- Regional leaderboards
- Push notifications for new quests and quest updates

**Phase 4 — Forum System**
- National, regional, and departmental forum categories
- Post creation, replies, reactions
- Moderation tools for leaders
- Search functionality

**Phase 5 — Telegram Integration**
- Structured Telegram group links on all region, department, and quest pages
- Optional: Telegram bot for activity summaries feeding back into the platform

**Phase 6 — Departments (Online & International)**
- Online Operations department with digital campaign quest types
- International Outreach department with European and US sub-departments
- Department forums, quests, and Telegram groups

**Phase 7 — Dashboards & National Coordination**
- Regional leader dashboards with analytics
- National dashboard with aggregate data and activity heatmap
- National campaign cascade system
- Cross-regional coordination tools

**Phase 8 — Constituency Unlock (Future)**
- Activate constituency boundaries within regions that reach membership thresholds
- Constituency-level leaders, quests, forums, and Telegram groups
- Full 650-constituency map view

**Phase 9 — Hardening & Scale**
- Security audit and penetration testing
- Performance optimisation for large member bases
- Automated moderation tools
- Accessibility audit and remediation

---

## 10. What This Document Does Not Cover

- **Security and encryption architecture** — Covered in companion document: *Security & Encryption Architecture*
- **Database schema and data model** — Covered in companion document: *Database Architecture*
- **UI/UX wireframes and design system** — Will be produced after open questions are resolved
- **Step-by-step implementation plan** — Will be produced after all three companion documents are reviewed, revised, and approved

---

*Document version: 0.2 — Updated to reflect national→regional→local progression, Telegram integration, membership gating, departments, and gamification*
*Last updated: February 2026*
*Author: Dennis Stevens & Claude (AI-assisted)*
