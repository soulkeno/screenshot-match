
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles or admin" on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text check (avatar_url is null or length(avatar_url) < 40000),
  is_vip boolean not null default false,
  total_wagered numeric(24,2) not null default 0,
  total_payout numeric(24,2) not null default 0,
  bets_count integer not null default 0,
  wins_count integer not null default 0,
  biggest_win numeric(24,2) not null default 0,
  biggest_multiplier numeric(14,2) not null default 0,
  banned_until timestamptz,
  ban_reason text,
  created_at timestamptz not null default now()
);
create unique index profiles_username_lower_idx on public.profiles (lower(username));
create index profiles_wagered_idx on public.profiles (total_wagered desc);
grant select on public.profiles to authenticated;
grant update (avatar_url) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "update own avatar" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(24,2) not null default 25000 check (balance >= 0),
  vault numeric(24,2) not null default 0 check (vault >= 0),
  vault_locked_until timestamptz,
  rakeback numeric(24,4) not null default 0,
  last_daily_at timestamptz,
  updated_at timestamptz not null default now()
);
grant select on public.wallets to authenticated;
grant all on public.wallets to service_role;
alter table public.wallets enable row level security;
create policy "own wallet or admin" on public.wallets for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create table public.bets (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  username text not null,
  user_wagered numeric(24,2) not null default 0,
  is_vip boolean not null default false,
  game text not null,
  wager numeric(24,2) not null,
  payout numeric(24,2) not null,
  multiplier numeric(14,4) not null,
  created_at timestamptz not null default now()
);
create index bets_created_idx on public.bets (created_at desc);
create index bets_user_idx on public.bets (user_id, created_at desc);
grant select on public.bets to authenticated;
grant all on public.bets to service_role;
grant usage, select on sequence public.bets_id_seq to service_role;
alter table public.bets enable row level security;
create policy "bets readable" on public.bets for select to authenticated using (true);

create table public.fair_seeds (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  server_seed text not null,
  server_seed_hash text not null,
  client_seed text not null,
  nonce integer not null default 0,
  prev_server_seed text,
  prev_server_seed_hash text,
  prev_client_seed text,
  prev_nonce integer,
  updated_at timestamptz not null default now()
);
grant all on public.fair_seeds to service_role;
alter table public.fair_seeds enable row level security;

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  wager numeric(24,2) not null,
  state jsonb not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index game_sessions_active_idx on public.game_sessions (user_id, game) where status = 'active';
grant all on public.game_sessions to service_role;
alter table public.game_sessions enable row level security;

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game)
);
grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "own favs select" on public.favorites for select to authenticated using (auth.uid() = user_id);
create policy "own favs insert" on public.favorites for insert to authenticated with check (auth.uid() = user_id);
create policy "own favs delete" on public.favorites for delete to authenticated using (auth.uid() = user_id);

create table public.chat_messages (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  username text not null default '',
  is_vip boolean not null default false,
  user_wagered numeric(24,2) not null default 0,
  content text not null,
  kind text not null default 'user',
  created_at timestamptz not null default now()
);
create index chat_created_idx on public.chat_messages (created_at desc);
grant select, insert on public.chat_messages to authenticated;
grant usage, select on sequence public.chat_messages_id_seq to authenticated;
grant all on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;
create policy "chat readable" on public.chat_messages for select to authenticated using (true);
create policy "chat insert own" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id and kind = 'user');

create or replace function public.chat_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record; last_at timestamptz;
begin
  if new.kind <> 'user' then return new; end if;
  select * into p from public.profiles where id = new.user_id;
  if p is null then raise exception 'Profile not found'; end if;
  if p.banned_until is not null and p.banned_until > now() then raise exception 'You are banned'; end if;
  new.content := btrim(new.content);
  if length(new.content) < 1 or length(new.content) > 200 then raise exception 'Message must be 1-200 characters'; end if;
  select max(created_at) into last_at from public.chat_messages where user_id = new.user_id;
  if last_at is not null and last_at > now() - interval '1.5 seconds' then raise exception 'Slow down a little'; end if;
  new.username := p.username; new.is_vip := p.is_vip; new.user_wagered := p.total_wagered;
  new.created_at := now();
  return new;
end $$;
create trigger chat_before_insert before insert on public.chat_messages for each row execute function public.chat_before_insert();

create table public.rains (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  host_username text not null,
  amount numeric(24,2) not null,
  participants integer not null default 0,
  ends_at timestamptz not null,
  settled boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.rain_entries (
  rain_id uuid not null references public.rains(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (rain_id, user_id)
);
grant select on public.rains, public.rain_entries to authenticated;
grant all on public.rains, public.rain_entries to service_role;
alter table public.rains enable row level security;
alter table public.rain_entries enable row level security;
create policy "rains readable" on public.rains for select to authenticated using (true);
create policy "entries readable" on public.rain_entries for select to authenticated using (true);

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  amount numeric(24,2) not null check (amount > 0),
  expires_at timestamptz,
  max_redemptions integer,
  redemptions integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index promo_codes_code_idx on public.promo_codes (lower(code));
create table public.code_redemptions (
  code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (code_id, user_id)
);
grant select on public.promo_codes, public.code_redemptions to authenticated;
grant all on public.promo_codes, public.code_redemptions to service_role;
alter table public.promo_codes enable row level security;
alter table public.code_redemptions enable row level security;
create policy "admins read codes" on public.promo_codes for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "own redemptions" on public.code_redemptions for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create table public.pvp_games (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  creator_name text not null,
  joiner_id uuid references public.profiles(id) on delete set null,
  joiner_name text,
  wager numeric(24,2) not null,
  config jsonb not null default '{}'::jsonb,
  state jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  winner_id uuid,
  server_seed_hash text not null,
  server_seed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pvp_status_idx on public.pvp_games (kind, status, created_at desc);
grant select on public.pvp_games to authenticated;
grant all on public.pvp_games to service_role;
alter table public.pvp_games enable row level security;
create policy "pvp readable" on public.pvp_games for select to authenticated using (true);

create table public.pvp_secrets (
  game_id uuid primary key references public.pvp_games(id) on delete cascade,
  server_seed text not null,
  secret jsonb not null default '{}'::jsonb
);
grant all on public.pvp_secrets to service_role;
alter table public.pvp_secrets enable row level security;

create or replace function public.rank_index(w numeric) returns integer language sql immutable set search_path = public as $$
  select case
    when w >= 250000000 then 7 when w >= 75000000 then 6 when w >= 20000000 then 5
    when w >= 5000000 then 4 when w >= 1000000 then 3 when w >= 250000 then 2
    when w >= 50000 then 1 else 0 end
$$;

create or replace function public.assert_not_banned(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b timestamptz;
begin
  select banned_until into b from public.profiles where id = p_user;
  if b is not null and b > now() then raise exception 'Your account is banned'; end if;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', '');
  if uname !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'Invalid username'; end if;
  insert into public.profiles (id, username) values (new.id, uname);
  insert into public.wallets (user_id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if lower(uname) = 'keno' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.username_available(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(btrim(p_name)))
$$;

create or replace function public.wallet_debit(p_user uuid, p_amount numeric) returns numeric
language plpgsql security definer set search_path = public as $$
declare v numeric;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid bet amount'; end if;
  perform public.assert_not_banned(p_user);
  update public.wallets set balance = balance - p_amount, updated_at = now()
    where user_id = p_user and balance >= p_amount returning balance into v;
  if v is null then raise exception 'Insufficient balance'; end if;
  return v;
end $$;

create or replace function public.wallet_credit(p_user uuid, p_amount numeric) returns numeric
language plpgsql security definer set search_path = public as $$
declare v numeric;
begin
  update public.wallets set balance = balance + greatest(p_amount, 0), updated_at = now()
    where user_id = p_user returning balance into v;
  return v;
end $$;

create or replace function public.record_bet(p_user uuid, p_game text, p_wager numeric, p_payout numeric)
returns void language plpgsql security definer set search_path = public as $$
declare p record; mult numeric; rate numeric;
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
  rate := case when p.is_vip then 0.006 else 0.003 end;
  update public.wallets set rakeback = rakeback + p_wager * rate where user_id = p_user;
  insert into public.bets (user_id, username, user_wagered, is_vip, game, wager, payout, multiplier)
    values (p_user, p.username, p.total_wagered, p.is_vip, p_game, p_wager, p_payout, mult);
end $$;

create or replace function public.settle_instant(p_user uuid, p_game text, p_wager numeric, p_payout numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare v numeric;
begin
  perform public.wallet_debit(p_user, p_wager);
  v := public.wallet_credit(p_user, p_payout);
  perform public.record_bet(p_user, p_game, p_wager, p_payout);
  return v;
end $$;

create or replace function public.settle_session(p_user uuid, p_game text, p_wager numeric, p_payout numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare v numeric;
begin
  v := public.wallet_credit(p_user, p_payout);
  perform public.record_bet(p_user, p_game, p_wager, p_payout);
  return v;
end $$;

revoke execute on function public.wallet_debit(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.wallet_credit(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.record_bet(uuid, text, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.settle_instant(uuid, text, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.settle_session(uuid, text, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.assert_not_banned(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.wallet_debit(uuid, numeric) to service_role;
grant execute on function public.wallet_credit(uuid, numeric) to service_role;
grant execute on function public.record_bet(uuid, text, numeric, numeric) to service_role;
grant execute on function public.settle_instant(uuid, text, numeric, numeric) to service_role;
grant execute on function public.settle_session(uuid, text, numeric, numeric) to service_role;
grant execute on function public.assert_not_banned(uuid) to service_role;
grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.claim_daily() returns numeric
language plpgsql security definer set search_path = public as $$
declare w record; p record; amt numeric; amounts numeric[] := array[1000,2500,5000,10000,25000,50000,100000,250000];
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform public.assert_not_banned(auth.uid());
  select * into w from public.wallets where user_id = auth.uid() for update;
  if w.last_daily_at is not null and w.last_daily_at > now() - interval '24 hours' then
    raise exception 'Daily reward not ready yet';
  end if;
  select * into p from public.profiles where id = auth.uid();
  amt := amounts[public.rank_index(p.total_wagered) + 1] * (case when p.is_vip then 2 else 1 end);
  update public.wallets set balance = balance + amt, last_daily_at = now(), updated_at = now() where user_id = auth.uid();
  return amt;
end $$;

create or replace function public.claim_rakeback() returns numeric
language plpgsql security definer set search_path = public as $$
declare amt numeric;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform public.assert_not_banned(auth.uid());
  select floor(rakeback * 100) / 100 into amt from public.wallets where user_id = auth.uid() for update;
  if amt is null or amt < 1 then raise exception 'Nothing to claim yet'; end if;
  update public.wallets set balance = balance + amt, rakeback = rakeback - amt, updated_at = now() where user_id = auth.uid();
  return amt;
end $$;

create or replace function public.vault_deposit(p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  update public.wallets set balance = balance - p_amount, vault = vault + p_amount, updated_at = now()
    where user_id = auth.uid() and balance >= p_amount;
  if not found then raise exception 'Insufficient balance'; end if;
end $$;

create or replace function public.vault_withdraw(p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
declare w record;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  select * into w from public.wallets where user_id = auth.uid() for update;
  if w.vault_locked_until is not null and w.vault_locked_until > now() then raise exception 'Your vault is locked'; end if;
  if w.vault < p_amount then raise exception 'Not enough in vault'; end if;
  update public.wallets set balance = balance + p_amount, vault = vault - p_amount, updated_at = now() where user_id = auth.uid();
end $$;

create or replace function public.vault_lock() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update public.wallets set vault_locked_until = greatest(coalesce(vault_locked_until, now()), now() + interval '24 hours'), updated_at = now()
    where user_id = auth.uid() returning vault_locked_until into t;
  return t;
end $$;

create or replace function public.redeem_code(p_code text) returns numeric
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform public.assert_not_banned(auth.uid());
  select * into c from public.promo_codes where lower(code) = lower(btrim(p_code)) for update;
  if c is null then raise exception 'Invalid code'; end if;
  if c.expires_at is not null and c.expires_at < now() then raise exception 'This code has expired'; end if;
  if c.max_redemptions is not null and c.redemptions >= c.max_redemptions then raise exception 'This code has been fully redeemed'; end if;
  if exists (select 1 from public.code_redemptions where code_id = c.id and user_id = auth.uid()) then raise exception 'You already redeemed this code'; end if;
  insert into public.code_redemptions (code_id, user_id) values (c.id, auth.uid());
  update public.promo_codes set redemptions = redemptions + 1 where id = c.id;
  update public.wallets set balance = balance + c.amount, updated_at = now() where user_id = auth.uid();
  return c.amount;
end $$;

create or replace function public.settle_rains() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer; share numeric; cnt integer := 0;
begin
  for r in select * from public.rains where settled = false and ends_at <= now() for update skip locked loop
    select count(*) into n from public.rain_entries where rain_id = r.id;
    if n = 0 then
      update public.wallets set balance = balance + r.amount where user_id = r.host_id;
      insert into public.chat_messages (username, content, kind) values ('Rain', 'Nobody joined the rain, ' || to_char(r.amount, 'FM999,999,999,990') || ' was returned to ' || r.host_username, 'system');
    else
      share := floor(r.amount / n * 100) / 100;
      update public.wallets w set balance = balance + share from public.rain_entries e where e.rain_id = r.id and e.user_id = w.user_id;
      insert into public.chat_messages (username, content, kind) values ('Rain', 'Rain ended! ' || n || ' players received ' || to_char(share, 'FM999,999,999,990.00') || ' each', 'rain');
    end if;
    update public.rains set settled = true where id = r.id;
    cnt := cnt + 1;
  end loop;
  return cnt;
end $$;

create or replace function public.start_rain(p_amount numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid; uname text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform public.assert_not_banned(auth.uid());
  if p_amount is null or p_amount < 1000 then raise exception 'Minimum rain is 1,000'; end if;
  perform public.settle_rains();
  update public.wallets set balance = balance - p_amount, updated_at = now() where user_id = auth.uid() and balance >= p_amount;
  if not found then raise exception 'Insufficient balance'; end if;
  select username into uname from public.profiles where id = auth.uid();
  select id into rid from public.rains where settled = false and ends_at > now() order by created_at limit 1 for update;
  if rid is not null then
    update public.rains set amount = amount + p_amount where id = rid;
    insert into public.chat_messages (username, content, kind) values ('Rain', uname || ' added ' || to_char(p_amount, 'FM999,999,999,990') || ' to the rain!', 'rain');
  else
    insert into public.rains (host_id, host_username, amount, ends_at) values (auth.uid(), uname, p_amount, now() + interval '15 minutes') returning id into rid;
    insert into public.chat_messages (username, content, kind) values ('Rain', uname || ' started a rain of ' || to_char(p_amount, 'FM999,999,999,990') || '! Join within 15 minutes.', 'rain');
  end if;
  return rid;
end $$;

create or replace function public.join_rain(p_rain uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record; n integer;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform public.assert_not_banned(auth.uid());
  select * into r from public.rains where id = p_rain for update;
  if r is null or r.settled or r.ends_at <= now() then raise exception 'This rain has ended'; end if;
  if r.host_id = auth.uid() then raise exception 'You cannot join your own rain'; end if;
  insert into public.rain_entries (rain_id, user_id) values (p_rain, auth.uid()) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then update public.rains set participants = participants + 1 where id = p_rain; end if;
end $$;

create or replace function public.assert_admin() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
end $$;

create or replace function public.admin_adjust_balance(p_user uuid, p_delta numeric) returns numeric
language plpgsql security definer set search_path = public as $$
declare v numeric;
begin
  perform public.assert_admin();
  update public.wallets set balance = greatest(balance + p_delta, 0), updated_at = now() where user_id = p_user returning balance into v;
  return v;
end $$;

create or replace function public.admin_set_vip(p_user uuid, p_vip boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  update public.profiles set is_vip = p_vip where id = p_user;
end $$;

create or replace function public.admin_ban(p_user uuid, p_until timestamptz, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  if p_user = auth.uid() then raise exception 'You cannot ban yourself'; end if;
  if exists (select 1 from public.profiles where id = p_user and lower(username) = 'keno') then raise exception 'The owner account cannot be banned'; end if;
  update public.profiles set banned_until = p_until, ban_reason = nullif(btrim(p_reason), '') where id = p_user;
end $$;

create or replace function public.admin_unban(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  update public.profiles set banned_until = null, ban_reason = null where id = p_user;
end $$;

create or replace function public.admin_set_admin(p_user uuid, p_admin boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  if p_admin then
    insert into public.user_roles (user_id, role) values (p_user, 'admin') on conflict do nothing;
  else
    if exists (select 1 from public.profiles where id = p_user and lower(username) = 'keno') then raise exception 'The owner account keeps admin'; end if;
    delete from public.user_roles where user_id = p_user and role = 'admin';
  end if;
end $$;

create or replace function public.admin_create_code(p_code text, p_amount numeric, p_expires timestamptz, p_max integer) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  perform public.assert_admin();
  if btrim(coalesce(p_code, '')) = '' then raise exception 'Code is required'; end if;
  insert into public.promo_codes (code, amount, expires_at, max_redemptions) values (btrim(p_code), p_amount, p_expires, p_max) returning id into cid;
  return cid;
end $$;

create or replace function public.admin_delete_code(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  delete from public.promo_codes where id = p_id;
end $$;

revoke execute on function public.assert_admin() from public, anon;
revoke execute on function public.claim_daily() from public, anon;
revoke execute on function public.claim_rakeback() from public, anon;
revoke execute on function public.vault_deposit(numeric) from public, anon;
revoke execute on function public.vault_withdraw(numeric) from public, anon;
revoke execute on function public.vault_lock() from public, anon;
revoke execute on function public.redeem_code(text) from public, anon;
revoke execute on function public.settle_rains() from public, anon;
revoke execute on function public.start_rain(numeric) from public, anon;
revoke execute on function public.join_rain(uuid) from public, anon;
revoke execute on function public.admin_adjust_balance(uuid, numeric) from public, anon;
revoke execute on function public.admin_set_vip(uuid, boolean) from public, anon;
revoke execute on function public.admin_ban(uuid, timestamptz, text) from public, anon;
revoke execute on function public.admin_unban(uuid) from public, anon;
revoke execute on function public.admin_set_admin(uuid, boolean) from public, anon;
revoke execute on function public.admin_create_code(text, numeric, timestamptz, integer) from public, anon;
revoke execute on function public.admin_delete_code(uuid) from public, anon;
grant execute on function public.claim_daily(), public.claim_rakeback(), public.vault_deposit(numeric), public.vault_withdraw(numeric),
  public.vault_lock(), public.redeem_code(text), public.settle_rains(), public.start_rain(numeric), public.join_rain(uuid),
  public.admin_adjust_balance(uuid, numeric), public.admin_set_vip(uuid, boolean), public.admin_ban(uuid, timestamptz, text),
  public.admin_unban(uuid), public.admin_set_admin(uuid, boolean), public.admin_create_code(text, numeric, timestamptz, integer),
  public.admin_delete_code(uuid), public.assert_admin() to authenticated;

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.bets;
alter publication supabase_realtime add table public.wallets;
alter publication supabase_realtime add table public.rains;
alter publication supabase_realtime add table public.pvp_games;
alter publication supabase_realtime add table public.profiles;
