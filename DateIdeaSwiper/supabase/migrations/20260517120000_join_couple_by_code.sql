-- Atomic partner join (bypasses client UPDATE + RLS silent 0-row failures).
-- Run in Supabase SQL Editor if not using `supabase db push`.

CREATE OR REPLACE FUNCTION public.join_couple_by_code(invite_code text)
RETURNS TABLE (
  id uuid,
  user1 uuid,
  user2 uuid,
  code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  cid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF invite_code IS NULL OR length(trim(invite_code)) < 4 THEN
    RETURN;
  END IF;

  SELECT c.id INTO cid
  FROM public.couples c
  WHERE c.code = trim(invite_code)
    AND c.user2 IS NULL
    AND c.user1 IS DISTINCT FROM uid
  LIMIT 1
  FOR UPDATE;

  IF cid IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.couples
  SET user2 = uid
  WHERE public.couples.id = cid;

  RETURN QUERY
  SELECT c.id, c.user1, c.user2, c.code
  FROM public.couples c
  WHERE c.id = cid;
END;
$$;

REVOKE ALL ON FUNCTION public.join_couple_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_couple_by_code(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
