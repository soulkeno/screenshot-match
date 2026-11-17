alter table public.wallets
  add column if not exists last_wheel_at timestamptz,
  add column if not exists rakeback_boost numeric not null default 1,
  add column if not exists rakeback_boost_until timestamptz,
  add column if not exists vault_since timestamptz,
  add column if not exists vault_interest_total numeric not null default 0,
  add column if not exists quest_streak integer not null default 0,
  add column if not exists last_quest_day date,
  add column if not exists cosmetics text[] not null default '{}';

update public.wallets set vault_since = now() where vault > 0 and vault_since is null;

create table public.wheel_spins (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier text not null,
  slice integer not null,
  label text not null,
  created_at timestamptz not null default now()
);
create index wheel_spins_user_idx on public.wheel_spins (user_id, created_at desc);
grant select on public.wheel_spins to authenticated;
grant all on public.wheel_spins to service_role;
grant usage, select on sequence public.wheel_spins_id_seq to service_role;
alter table public.wheel_spins enable row level security;
create policy "own spins" on public.wheel_spins for select to authenticated using (auth.uid() = user_id);

create table public.daily_quests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  quests jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
create table public.quest_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  idx integer not null,
  amount numeric not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, idx)
);
grant all on public.daily_quests, public.quest_claims to service_role;
alter table public.daily_quests enable row level security;
alter table public.quest_claims enable row level security;

create table public.crash_rounds (
  id bigserial primary key,
  seq bigint not null unique,
  crash_point numeric not null,
  server_seed text not null,
  seed_hash text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  settled boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.crash_bets (
  id bigserial primary key,
  round_id bigint not null references public.crash_rounds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  username text not null,
  wager numeric not null,
  auto numeric,
  cashed_at numeric,
  payout numeric not null default 0,
  settled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (round_id, user_id)
);
create index crash_bets_round_idx on public.crash_bets (round_id);
grant all on public.crash_rounds, public.crash_bets to service_role;
grant usage, select on sequence public.crash_rounds_id_seq, public.crash_bets_id_seq to service_role;
alter table public.crash_rounds enable row level security;
alter table public.crash_bets enable row level security;

-- Rakeback booster
create or replace function public.record_bet(p_user uuid, p_game text, p_wager numeric, p_payout numeric)
returns void language plpgsql security definer set search_path = public as $$
declare p record; w record; mult numeric; rate numeric;
begin
  mult := case when p_wager > 0 then round(p_payout / p_wager, 4) else 0 end;
  update public.profiles set
    total_wagered = total_wagered + p_wager,
    total_payout = total_payout + p_payout,
    bets_count = bets_count + 1,
    wins_count = wins_count + (case when p_payout > p_wager then 1 else 0 end),
    biggest_win = greatest(biggest_win, p_payout - p_wager),
    biggest_multiplier = greatest(biggest_multiplier, least(mult, 999999))
  where id = p_user returning * into p;
  select rakeback_boost, rakeback_boost_until into w from public.wallets where user_id = p_user;
  rate := (case when p.is_vip then 0.006 else 0.003 end)
        * (case when w.rakeback_boost_until is not null and w.rakeback_boost_until > now() then greatest(coalesce(w.rakeback_boost, 1), 1) else 1 end);
  update public.wallets set rakeback = rakeback + p_wager * rate where user_id = p_user;
  insert into public.bets (user_id, username, user_wagered, is_vip, game, wager, payout, multiplier)
    values (p_user, p.username, p.total_wagered, p.is_vip, p_game, p_wager, p_payout, mult);
end $$;

-- Vault interest: keep in sync with vaultRate() in src/lib/rewards.ts
create or replace function public.vault_rate(p_user uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select least(0.02, 0.01 + public.rank_index(total_wagered) * 0.00125 + (case when is_vip then 0.005 else 0 end))
  from public.profiles where id = p_user
$$;

create or replace function public.vault_accrue(p_user uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare w record; days integer; rate numeric; gain numeric;
begin
  select * into w from public.wallets where user_id = p_user for update;
  if w is null then return 0; end if;
  if w.vault <= 0 then
    if w.vault_since is not null then update public.wallets set vault_since = null where user_id = p_user; end if;
    return 0;
  end if;
  if w.vault_since is null then
    update public.wallets set vault_since = now() where user_id = p_user;
    return 0;
  end if;
  days := least(365, floor(extract(epoch from (now() - w.vault_since)) / 86400)::integer);
  if days < 1 then return 0; end if;
  rate := coalesce(public.vault_rate(p_user), 0.01);
  gain := floor(w.vault * (power(1 + rate, days) - 1) * 100) / 100;
  update public.wallets set vault = vault + gain, vault_interest_total = vault_interest_total + gain,
    vault_since = w.vault_since + make_interval(days => days), updated_at = now()
    where user_id = p_user;
  return gain;
end $$;

create or replace function public.vault_collect() returns numeric
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  return public.vault_accrue(auth.uid());
end $$;

create or replace function public.vault_deposit(p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  perform public.vault_accrue(auth.uid());
  update public.wallets set balance = balance - p_amount, vault = vault + p_amount, vault_since = now(), updated_at = now()
    where user_id = auth.uid() and balance >= p_amount;
  if not found then raise exception 'Insufficient balance'; end if;
end $$;

create or replace function public.vault_withdraw(p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
declare w record;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  perform public.vault_accrue(auth.uid());
  select * into w from public.wallets where user_id = auth.uid() for update;
  if w.vault_locked_until is not null and w.vault_locked_until > now() then raise exception 'Your vault is locked'; end if;
  if w.vault < p_amount then raise exception 'Not enough in vault'; end if;
  update public.wallets set balance = balance + p_amount, vault = vault - p_amount,
    vault_since = case when vault - p_amount > 0 then now() else null end, updated_at = now()
    where user_id = auth.uid();
end $$;

revoke execute on function public.vault_accrue(uuid) from public, anon, authenticated;
grant execute on function public.vault_accrue(uuid) to service_role;
revoke execute on function public.vault_rate(uuid) from public, anon;
grant execute on function public.vault_rate(uuid) to authenticated, service_role;
revoke execute on function public.vault_collect() from public, anon;
grant execute on function public.vault_collect() to authenticated;

-- Tipping
create or replace function public.send_tip(p_username text, p_amount numeric) returns numeric
language plpgsql security definer set search_path = public as $$
declare me record; target record; amt numeric; v numeric;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform public.assert_not_banned(auth.uid());
  amt := floor(coalesce(p_amount, 0) * 100) / 100;
  if amt < 10 then raise exception 'Minimum tip is 10 coins'; end if;
  select id, username into target from public.profiles where lower(username) = lower(btrim(ltrim(coalesce(p_username, ''), '@')));
  if target.id is null then raise exception 'Player not found'; end if;
  if target.id = auth.uid() then raise exception 'You cannot tip yourself'; end if;
  select username into me from public.profiles where id = auth.uid();
  update public.wallets set balance = balance - amt, updated_at = now() where user_id = auth.uid() and balance >= amt returning balance into v;
  if v is null then raise exception 'Insufficient balance'; end if;
  update public.wallets set balance = balance + amt, updated_at = now() where user_id = target.id;
  insert into public.chat_messages (username, content, kind)
    values ('Tip', me.username || ' tipped ' || target.username || ' ' || to_char(amt, 'FM999,999,999,990.##') || ' coins', 'tip');
  return v;
end $$;
revoke execute on function public.send_tip(text, numeric) from public, anon;
grant execute on function public.send_tip(text, numeric) to authenticated;

-- Daily race (today's wagered, UTC)
create or replace function public.daily_race(p_limit integer default 50)
returns table (user_id uuid, username text, avatar_url text, is_vip boolean, total_wagered numeric, wagered numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_active_player(auth.uid()) then return; end if;
  return query
    select b.user_id, p.username, p.avatar_url, p.is_vip, p.total_wagered, sum(b.wager) as wagered
    from public.bets b join public.profiles p on p.id = b.user_id
    where b.created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
      and (p.banned_until is null or p.banned_until <= now())
    group by b.user_id, p.username, p.avatar_url, p.is_vip, p.total_wagered
    order by wagered desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100);
end $$;

create or replace function public.my_race_place()
returns table (place bigint, wagered numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  return query
    with t as (
      select b.user_id, sum(b.wager) as w from public.bets b
      where b.created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
      group by b.user_id
    ), r as (select t.user_id, t.w, rank() over (order by t.w desc) as pl from t)
    select r.pl, r.w from r where r.user_id = auth.uid();
end $$;
revoke execute on function public.daily_race(integer) from public, anon;
revoke execute on function public.my_race_place() from public, anon;
grant execute on function public.daily_race(integer) to authenticated;
grant execute on function public.my_race_place() to authenticated;