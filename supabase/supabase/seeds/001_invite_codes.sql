-- Seed invite codes for Phase 1.2 testing and initial member onboarding
-- Each code can be used up to max_uses times. Expires in 90 days.
-- Format: RB-XXXX-XXXX (human-readable, easy to share)

INSERT INTO public.invite_codes (code, max_uses, times_used, expires_at)
VALUES
  -- Admin / founder codes (high usage limit)
  ('RB-ADMIN-0001', 100, 0, NOW() + INTERVAL '90 days'),
  ('RB-ADMIN-0002', 100, 0, NOW() + INTERVAL '90 days'),

  -- Team codes (moderate usage)
  ('RB-TEAM-1001', 25, 0, NOW() + INTERVAL '90 days'),
  ('RB-TEAM-1002', 25, 0, NOW() + INTERVAL '90 days'),
  ('RB-TEAM-1003', 25, 0, NOW() + INTERVAL '90 days'),

  -- Standard invite codes (5 uses each — for sharing with individuals)
  ('RB-2026-ALPHA', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-BRAVO', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-CHARLIE', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-DELTA', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-ECHO', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-FOXTROT', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-GOLF', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-HOTEL', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-INDIA', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-JULIET', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-KILO', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-LIMA', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-MIKE', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-NOVEMBER', 5, 0, NOW() + INTERVAL '90 days'),
  ('RB-2026-OSCAR', 5, 0, NOW() + INTERVAL '90 days')
ON CONFLICT (code) DO NOTHING;
