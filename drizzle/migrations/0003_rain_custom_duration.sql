create or replace function public.start_rain(p_amount numeric, p_minutes integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; uname text; mins integer;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform public.assert_not_banned(auth.uid());
  if p_amount is null or p_amount < 1000 then raise exception 'Minimum rain is 1,000'; end if;
  mins := coalesce(p_minutes, 15);
  if mins < 1 or mins > 1440 then raise exception 'Rain length must be between 1 minute and 24 hours'; end if;
  perform public.settle_rains();
  update public.wallets set balance = balance - p_amount, updated_at = now() where user_id = auth.uid() and balance >= p_amount;
  if not found then raise exception 'Insufficient balance'; end if;
  select username into uname from public.profiles where id = auth.uid();
  select id into rid from public.rains where settled = false and ends_at > now() order by created_at limit 1 for update;
  if rid is not null then
    update public.rains set amount = amount + p_amount where id = rid;
    insert into public.chat_messages (username, content, kind) values ('Rain', uname || ' added ' || to_char(p_amount, 'FM999,999,999,990') || ' to the rain!', 'rain');
  else
    insert into public.rains (host_id, host_username, amount, ends_at) values (auth.uid(), uname, p_amount, now() + make_interval(mins => mins)) returning id into rid;
    insert into public.chat_messages (username, content, kind) values ('Rain', uname || ' started a rain of ' || to_char(p_amount, 'FM999,999,999,990') || '! Join within ' ||
      case when mins >= 60 and mins % 60 = 0 then (mins / 60) || ' hour' || case when mins = 60 then '' else 's' end
           else mins || ' minute' || case when mins = 1 then '' else 's' end end || '.', 'rain');
  end if;
  return rid;
end $$;
revoke execute on function public.start_rain(numeric, integer) from public, anon;
grant execute on function public.start_rain(numeric, integer) to authenticated;