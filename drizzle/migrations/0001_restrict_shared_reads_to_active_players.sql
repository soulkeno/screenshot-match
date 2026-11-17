CREATE OR REPLACE FUNCTION public.is_active_player(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _uid IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _uid AND (p.banned_until IS NULL OR p.banned_until <= now())
  )
$$;
REVOKE ALL ON FUNCTION public.is_active_player(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_player(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "bets readable" ON public.bets;
CREATE POLICY "bets readable" ON public.bets FOR SELECT TO authenticated
  USING (public.is_active_player(auth.uid()));

DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_active_player(auth.uid()));

DROP POLICY IF EXISTS "entries readable" ON public.rain_entries;
CREATE POLICY "entries readable" ON public.rain_entries FOR SELECT TO authenticated
  USING (public.is_active_player(auth.uid()));

DROP POLICY IF EXISTS "chat readable" ON public.chat_messages;
CREATE POLICY "chat readable" ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_active_player(auth.uid()));

DROP POLICY IF EXISTS "rains readable" ON public.rains;
CREATE POLICY "rains readable" ON public.rains FOR SELECT TO authenticated
  USING (public.is_active_player(auth.uid()));

DROP POLICY IF EXISTS "pvp readable" ON public.pvp_games;
CREATE POLICY "pvp readable" ON public.pvp_games FOR SELECT TO authenticated
  USING (public.is_active_player(auth.uid()));