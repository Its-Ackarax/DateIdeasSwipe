-- Row Level Security for MVP tables + safe invite-code lookup (no listing open invites).
-- Apply on your Supabase project (Dashboard SQL or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Invite lookup (join flow) — avoids SELECT policies that expose all pending rows
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_couple_invite_by_code(invite_code text)
RETURNS TABLE (
  id uuid,
  user1 uuid,
  user2 uuid,
  code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.user1, c.user2, c.code
  FROM public.couples c
  WHERE c.code = trim(invite_code)
    AND c.user2 IS NULL
    AND length(trim(invite_code)) >= 4
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_couple_invite_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_couple_invite_by_code(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- couples
-- ---------------------------------------------------------------------------
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS couples_select_member ON public.couples;
CREATE POLICY couples_select_member ON public.couples
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user1 OR auth.uid() = user2);

DROP POLICY IF EXISTS couples_insert_own ON public.couples;
CREATE POLICY couples_insert_own ON public.couples
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1 AND user2 IS NULL);

DROP POLICY IF EXISTS couples_update_creator ON public.couples;
CREATE POLICY couples_update_creator ON public.couples
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1)
  WITH CHECK (auth.uid() = user1);

DROP POLICY IF EXISTS couples_update_join ON public.couples;
CREATE POLICY couples_update_join ON public.couples
  FOR UPDATE
  TO authenticated
  USING (user2 IS NULL AND user1 IS DISTINCT FROM auth.uid())
  WITH CHECK (user2 = auth.uid() AND user1 IS DISTINCT FROM auth.uid());

DROP POLICY IF EXISTS couples_delete_member ON public.couples;
CREATE POLICY couples_delete_member ON public.couples
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user1 OR auth.uid() = user2);

-- ---------------------------------------------------------------------------
-- swipes
-- ---------------------------------------------------------------------------
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS swipes_select_own_or_couple ON public.swipes;
CREATE POLICY swipes_select_own_or_couple ON public.swipes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      couple_id IS NOT NULL
      AND couple_id IN (
        SELECT c.id
        FROM public.couples c
        WHERE c.user1 = auth.uid() OR c.user2 = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS swipes_insert_own ON public.swipes;
CREATE POLICY swipes_insert_own ON public.swipes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      couple_id IS NULL
      OR couple_id IN (
        SELECT c.id
        FROM public.couples c
        WHERE c.user1 = auth.uid() OR c.user2 = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS swipes_update_own ON public.swipes;
CREATE POLICY swipes_update_own ON public.swipes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS swipes_delete_own ON public.swipes;
CREATE POLICY swipes_delete_own ON public.swipes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matches_select_couple_member ON public.matches;
CREATE POLICY matches_select_couple_member ON public.matches
  FOR SELECT
  TO authenticated
  USING (
    couple_id IN (
      SELECT c.id
      FROM public.couples c
      WHERE c.user1 = auth.uid() OR c.user2 = auth.uid()
    )
  );

DROP POLICY IF EXISTS matches_insert_couple_member ON public.matches;
CREATE POLICY matches_insert_couple_member ON public.matches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    couple_id IN (
      SELECT c.id
      FROM public.couples c
      WHERE c.user1 = auth.uid() OR c.user2 = auth.uid()
    )
  );

DROP POLICY IF EXISTS matches_delete_couple_member ON public.matches;
CREATE POLICY matches_delete_couple_member ON public.matches
  FOR DELETE
  TO authenticated
  USING (
    couple_id IN (
      SELECT c.id
      FROM public.couples c
      WHERE c.user1 = auth.uid() OR c.user2 = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- dates (read-only catalog for signed-in users)
-- ---------------------------------------------------------------------------
ALTER TABLE public.dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dates_select_authenticated ON public.dates;
CREATE POLICY dates_select_authenticated ON public.dates
  FOR SELECT
  TO authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
