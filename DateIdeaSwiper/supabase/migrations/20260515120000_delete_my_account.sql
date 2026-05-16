-- Self-service account deletion: removes app data for the current user, their couple/matches,
-- then deletes the auth user. Apply this migration to your Supabase project (Dashboard SQL or `supabase db push`).

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := (SELECT auth.uid());
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.matches
  WHERE couple_id IN (
    SELECT id FROM public.couples
    WHERE user1 = uid OR user2 = uid
  );

  DELETE FROM public.couples
  WHERE user1 = uid OR user2 = uid;

  DELETE FROM public.swipes
  WHERE user_id = uid;

  DELETE FROM auth.users
  WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- Refresh PostgREST so the new RPC appears immediately (avoids "not in schema cache").
NOTIFY pgrst, 'reload schema';
