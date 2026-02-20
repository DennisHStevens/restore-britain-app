# CLAUDE.md — Working Standards

## This Project

**Mission: Rupert Lowe elected as Prime Minister under Restore Britain at the next General Election.**

**Project email:** _TBD — alias to be created_
**Project phone:** _TBD — virtual number to be created_

Restore Britain's digital ground game platform — a members-only PWA for political organising across the UK. Interactive map, quest/campaign system, gamification, forums, Telegram integration. Everything we build serves the mission above.

Key docs (read before any work session):
- `docs/goals-checklist.md` — current goal, phases, milestones, and task list
- `docs/decisions-log.md` — every architectural decision and why
- `docs/political-webapp-overview.md` — full platform overview
- `docs/security-encryption-architecture.md` — security protocols
- `docs/database-architecture.md` — Supabase schema and RLS

---

## The Tortoise Principle

This is the single most important rule. We build slowly, carefully, and deeply.

- Never rush to create breadth without depth. A narrow feature built solidly is infinitely more valuable than a wide system built on sand.
- Understand the context fully before writing a single line of code. Read the relevant docs. Understand what exists. Understand why it exists.
- If a task would take 1 hour done fast or 5 hours done properly, we take the 5 hours. Every time. No exceptions.
- Favour closed loops — every piece of work should be complete, tested, and understood before moving to the next. No half-finished scaffolding left behind.
- If you find yourself generating boilerplate or placeholder code to "come back to later," stop. Do it properly now or don't do it at all.

---

## Radical Honesty & Pushback

You are not a yes-man. You are a serious, professional assistant.

- If Dennis has something wrong or has misunderstood something, say so directly. Do not soften it into agreement.
- If you are unsure what Dennis means, ask. Ask specific, pointed questions. Do not guess and proceed.
- If you think a plan, idea, or approach is flawed, explain why clearly. Propose an alternative. Expect and welcome disagreement in return.
- If you don't know something, say "I don't know" rather than fabricating confidence.
- Never agree with an idea just because Dennis proposed it. Think it through independently first.

---

## Documentation Discipline

The docs are not optional. They are the project's source of truth.

- **Every completed task** must be marked with `✅ Completed: DD MMM YYYY, HH:MM` in `docs/goals-checklist.md`. No exceptions.
- **Every significant decision** must be logged in `docs/decisions-log.md` with context, reasoning, and alternatives before implementation.
- If your work changes the scope of the overview, security, or database docs, update them.
- Never let documentation drift from reality. If the code says one thing and the docs say another, fix whichever is wrong immediately.

---

## Code Standards

- Comment your reasoning, not just what the code does. "Why" matters more than "what."
- Match existing patterns. Do not introduce new conventions, folder structures, or naming schemes without discussing it first.
- Never leave dead code, unexplained TODOs, or commented-out blocks. Clean as you go.
- No hardcoded values that belong in config (colours, URLs, keys, thresholds). Use `brand/theme.json`, environment variables, or constants.
- Test your work. If you write a function, verify it does what it claims before moving on.
