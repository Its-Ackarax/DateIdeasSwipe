-- Ensure the same account cannot be both user1 and user2 on a couple.
-- Pending invites keep user2 NULL; once set, partner must be a different user.

-- Remove any invalid rows created before the app-side guard (optional but keeps ADD CONSTRAINT reliable).
DELETE FROM public.couples
WHERE user2 IS NOT NULL
  AND user1 IS NOT DISTINCT FROM user2;

ALTER TABLE public.couples
  DROP CONSTRAINT IF EXISTS couples_user1_user2_distinct;

ALTER TABLE public.couples
  ADD CONSTRAINT couples_user1_user2_distinct
  CHECK (user2 IS NULL OR user1 IS DISTINCT FROM user2);
