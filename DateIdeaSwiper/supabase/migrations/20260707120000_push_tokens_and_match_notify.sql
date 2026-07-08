-- Push notification tokens for match alerts + account deletion cleanup.
-- Apply on your Supabase project (Dashboard SQL or `supabase db push`).

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_tokens_select_own ON public.push_tokens;
CREATE POLICY push_tokens_select_own ON public.push_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_tokens_insert_own ON public.push_tokens;
CREATE POLICY push_tokens_insert_own ON public.push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_tokens_update_own ON public.push_tokens;
CREATE POLICY push_tokens_update_own ON public.push_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_tokens_delete_own ON public.push_tokens;
CREATE POLICY push_tokens_delete_own ON public.push_tokens
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Include push tokens in self-service account deletion.
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

  DELETE FROM public.push_tokens
  WHERE user_id = uid;

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

NOTIFY pgrst, 'reload schema';
