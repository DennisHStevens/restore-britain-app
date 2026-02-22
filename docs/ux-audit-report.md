# UX Audit Report — Restore Britain PWA

**Date:** 22 Feb 2026
**Auditor:** Claude (automated + visual testing)
**Tested on:** Desktop Chrome (responsive), live deployment
**Benchmark:** Top-rated community/political apps (Discord, Reddit, Citizen, Signal)

---

## Overall UX Score: 72 / 100

| Category | Score | Weight | Weighted |
|---|---|---|---|
| Visual Consistency | 7.5 / 10 | 20% | 15.0 |
| Navigation & Flow | 8.0 / 10 | 20% | 16.0 |
| Content Clarity | 5.5 / 10 | 15% | 8.25 |
| Typography & Readability | 7.0 / 10 | 10% | 7.0 |
| Touch Targets & Interaction | 7.0 / 10 | 10% | 7.0 |
| Loading & Feedback | 7.5 / 10 | 10% | 7.5 |
| Onboarding & First Run | 8.0 / 10 | 10% | 8.0 |
| Branding & Identity | 6.0 / 10 | 5% | 3.0 |
| **Total** | | | **71.75 → 72** |

---

## Category Breakdown

### 1. Visual Consistency — 7.5/10

**Strengths:** CSS variable system is thorough. Colour palette is cohesive. Card styles, borders, and spacing feel unified across Boards, Profile, and Admin.

**Issues found:**
- Board names use raw developer slugs (`gb/national`, `gb/east-midlands`) instead of human-readable names — jars against the polished feel elsewhere.
- Page title "gb/ Boards" leaks internal nomenclature into the UI.
- Heading font (Montserrat) is loaded but not applied to all page titles — some use the body font.

### 2. Navigation & Flow — 8.0/10

**Strengths:** Two-tab bottom nav (Map / Boards) is clean and simple. Profile accessible from header. Admin shield icon is discoverable for admin users. Route transitions are instant.

**Issues found:**
- No back button on BoardView — user relies on bottom nav or browser back. Reddit/Discord both have an explicit back arrow.
- Board list → Board → Post → Back works, but the board name in the header isn't tappable (missed breadcrumb opportunity).

### 3. Content Clarity — 5.5/10 ⚠️ (Lowest score)

**Issues found:**
- **Critical:** Board names everywhere show `gb/{slug}` (e.g. `gb/national`, `gb/east-midlands`) instead of the human-readable `board.name` field. This is the single biggest UX issue — it looks like a developer tool, not a consumer app.
- **Critical:** Page title says `gb/ Boards` — confusing to non-technical users.
- **Critical:** Empty state says "Be the first to start a discussion in gb/{slug}" — raw slug in user-facing copy.
- Board card footer shows board creation date (TimeAgo), not last activity — provides no useful information to the user after initial setup.
- The CSS comment header still reads `gb/ Boards — Community Forum Styles` — minor but shows the pattern is widespread.

### 4. Typography & Readability — 7.0/10

**Strengths:** Lato body font renders cleanly. Line heights are comfortable (1.4–1.6). Font sizes follow a clear hierarchy.

**Issues found:**
- Montserrat (heading font) is loaded via Google Fonts but only applied to `.app-header-title`. Board titles, post titles, and page headings all use the body font.
- The `boards-page-title` at 1.375rem feels slightly oversized for a page title within the shell.
- Login/Register page titles don't use the heading font.

### 5. Touch Targets & Interaction — 7.0/10

**Strengths:** Bottom nav buttons are 48px tall (WCAG minimum). FAB is 56px. Vote arrows have adequate padding.

**Issues found:**
- Comment send button is 36×36px — below the recommended 44×44px minimum for mobile (Apple HIG). This caused difficulty during testing.
- Refresh button in BoardView is small and easy to miss.
- Header profile/admin icons at 36×36px are tight for mobile thumbs.

### 6. Loading & Feedback — 7.5/10

**Strengths:** Skeleton loading cards animate with shimmer effect. Loading states exist for all data fetches. Error states are clear with red text.

**Issues found:**
- No visual feedback on button press (no active state animation on Login/Register submit buttons).
- Optimistic voting updates are instant (good), but no toast/snackbar for errors.
- No pull-to-refresh gesture support — only a small refresh icon.

### 7. Onboarding & First Run — 8.0/10

**Strengths:** Install guide is platform-adaptive (iOS/Android/desktop). Postcode entry with live region detection is excellent UX. Map fallback for manual region selection is thoughtful. Privacy reassurance about postcode is a nice trust signal.

**Issues found:**
- No logo/branding on the Install Guide step — just text.
- The "Skip for now" underlined text button could be more prominent to avoid users feeling trapped.

### 8. Branding & Identity — 6.0/10

**Issues found:**
- Login page has no logo — just the text "Restore Britain". First impression for new users is plain.
- Register page also has no logo.
- The header logo (`rb-logo-40.png`) is small and the only visual brand touchpoint during normal use.
- No favicon visible in browser tab during testing (may be present but not verified).

---

## Priority Fixes

### P0 — Critical (impacts every user, every session)

1. **Replace `gb/{slug}` with human-readable board names** across BoardList.tsx and BoardView.tsx. The Board type already has a `.name` field — use it.
2. **Fix page title** from "gb/ Boards" to "Boards".
3. **Fix empty state copy** from "Be the first to start a discussion in gb/{slug}" to use board name.

### P1 — High (brand & first impression)

4. **Add logo to Login and Register pages** — the user's first impression should include the brand mark.
5. **Apply heading font (Montserrat) to all page/section titles** — currently only the header bar uses it.
6. **Enlarge comment send button** from 36px to 44px for mobile.

### P2 — Medium (polish)

7. **Add a back button** to BoardView header for navigating back to board list.
8. **Improve board card footer** — show last post activity instead of board creation date.
9. **Add active/pressed state** to Login/Register submit buttons.
10. **Enlarge header icon tap targets** from 36px to 40px.

### P3 — Low (nice-to-have)

11. Add pull-to-refresh gesture to board feeds.
12. Add search functionality.
13. Add toast notifications for errors.

---

## Target: 85+ / 100

After implementing P0 and P1 fixes, the projected score rises to approximately 82–85. The content clarity category alone should jump from 5.5 to 8.5 once `gb/{slug}` is replaced with proper names. Branding jumps from 6.0 to 8.0 with the logo additions.
