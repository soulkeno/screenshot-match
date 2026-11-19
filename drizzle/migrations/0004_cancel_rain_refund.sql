-- Cancel a rain: refund every participant (including the host) and remove the rain.
-- Only the host of the rain or an admin may cancel it.
create or replace function public.cancel_rain(p_rain uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rain public.rains%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_rain from public.rains where id = p_rain for update;
  if not found then
    raise exception 'rain not found';
  end if;
  if v_rain.settled then
    raise exception 'rain already settled';
  end if;
  if v_rain.host_id <> v_uid and not public.is_admin(v_uid) then
    raise exception 'only the host or an admin can cancel this rain';
  end if;

  -- Refund every entry back to its owner.
  update public.profiles p
  set balance = p.balance + e.amount
  from public.rain_entries e
  where e.rain_id = p_rain and e.user_id = p.id;

  delete from public.rain_entries where rain_id = p_rain;
  delete from public.rains where id = p_rain;

  insert into public.chat_messages (user_id, username, kind, content)
  values (v_uid, (select username from public.profiles where id = v_uid), 'rain',
    'The rain by ' || v_rain.host_username || ' was cancelled. Everyone got their coins back.');
end;
$$;

grant execute on function public.cancel_rain(uuid) to authenticated;