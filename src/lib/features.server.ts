/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import { floats, randomHex, sha256Hex } from "@/lib/fair";
import * as L from "@/lib/games/logic";
import {
  WHEELS, WHEEL_COOLDOWN_MS, wheelTierFor, pickSlice, QUEST_POOL, pickQuests, questProgress, questGoal,
  nextStreak, streakBonus, utcDay, CRASH_BET_MS, CRASH_COOLDOWN_MS, type QuestDef,
} from "@/lib/rewards";

function fail(msg: string): never {
  throw new Error(msg);
}
async function rpc<T = any>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (db.rpc as any)(fn, args);
  if (error) fail(error.message);
  return data as T;
}
const credit = (u: string, a: number) => rpc<number>("wallet_credit", { p_user: u, p_amount: a });
const debit = (u: string, a: number) => rpc<number>("wallet_debit", { p_user: u, p_amount: a });
const settleSession = (u: string, g: string, w: number, p: number) => rpc<number>("settle_session", { p_user: u, p_game: g, p_wager: w, p_payout: p });
const rand = () => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
};
async function assertActive(userId: string) {
  const { data } = await db.from("profiles").select("banned_until, total_wagered").eq("id", userId).single();
  if (!data) fail("Profile not found");
  if (data.banned_until && new Date(data.banned_until) > new Date()) fail("Your account is banned");
  return data;
}

// ---------------- Lucky Wheel ----------------
export async function spinWheel(userId: string) {
  const prof = await assertActive(userId);
  const rankIdx = await rpc<number>("rank_index", { w: prof.total_wagered });
  const tier = wheelTierFor(rankIdx);
  const wheel = WHEELS[tier];
  const cutoff = new Date(Date.now() - WHEEL_COOLDOWN_MS).toISOString();
  const nowIso = new Date().toISOString();
  // Atomic 24h gate: only one request can flip last_wheel_at.
  const { data: w } = await db.from("wallets").update({ last_wheel_at: nowIso })
    .eq("user_id", userId).or(`last_wheel_at.is.null,last_wheel_at.lt.${cutoff}`)
    .select("cosmetics, rakeback_boost, rakeback_boost_until").maybeSingle();
  if (!w) fail("Your next spin isn't ready yet");

  let slice = pickSlice(wheel.prizes, rand());
  let prize = wheel.prizes[slice];
  let cosmetic: string | null = null;
  let label = prize.label;
  if (prize.kind === "cosmetic") {
    const owned = new Set(w.cosmetics ?? []);
    const left = prize.pool.filter((id) => !owned.has(id));
    if (left.length === 0) {
      // Everything already owned: fall back to the biggest coin slice.
      slice = wheel.prizes.reduce((best, p, i) => (p.kind === "coins" && (wheel.prizes[best].kind !== "coins" || p.amount > (wheel.prizes[best] as any).amount) ? i : best), 0);
      prize = wheel.prizes[slice];
      label = prize.label;
    } else {
      cosmetic = left[Math.floor(rand() * left.length)];
      await db.from("wallets").update({ cosmetics: [...(w.cosmetics ?? []), cosmetic] }).eq("user_id", userId);
    }
  }
  if (prize.kind === "coins") {
    await credit(userId, prize.amount);
    label = `${prize.amount.toLocaleString("en-US")} Coins`;
  } else if (prize.kind === "boost") {
    const curUntil = w.rakeback_boost_until ? new Date(w.rakeback_boost_until).getTime() : 0;
    const active = curUntil > Date.now();
    const until = Math.max(active ? curUntil : 0, Date.now() + prize.hours * 3_600_000);
    const mult = Math.max(active ? Number(w.rakeback_boost) : 1, prize.mult);
    await db.from("wallets").update({ rakeback_boost: mult, rakeback_boost_until: new Date(until).toISOString() }).eq("user_id", userId);
  }
  await db.from("wheel_spins").insert({ user_id: userId, tier, slice, label: cosmetic ? `${label}: ${cosmetic}` : label });
  const { data: after } = await db.from("wallets").select("balance").eq("user_id", userId).single();
  return { tier, slice, kind: prize.kind, label, cosmetic, balance: Number(after?.balance ?? 0) };
}

// ---------------- Daily Quests ----------------
const dayStartIso = (day: string) => `${day}T00:00:00.000Z`;
async function ensureQuests(userId: string, day: string): Promise<string[]> {
  const { data } = await db.from("daily_quests").select("quests").eq("user_id", userId).eq("day", day).maybeSingle();
  if (data) return data.quests as string[];
  const ids = pickQuests([rand(), rand(), rand()]);
  await db.from("daily_quests").insert({ user_id: userId, day, quests: ids });
  const { data: again } = await db.from("daily_quests").select("quests").eq("user_id", userId).eq("day", day).single();
  return (again?.quests as string[]) ?? ids;
}
async function questState(userId: string) {
  const day = utcDay();
  const ids = await ensureQuests(userId, day);
  const defs = ids.map((id) => QUEST_POOL.find((q) => q.id === id)).filter(Boolean) as QuestDef[];
  const [{ data: bets }, { data: claims }, { data: w }] = await Promise.all([
    db.from("bets").select("game, wager, payout, multiplier").eq("user_id", userId).gte("created_at", dayStartIso(day)).limit(10000),
    db.from("quest_claims").select("idx").eq("user_id", userId).eq("day", day),
    db.from("wallets").select("quest_streak, last_quest_day").eq("user_id", userId).single(),
  ]);
  const rows = (bets ?? []).map((b: any) => ({ game: b.game, wager: Number(b.wager), payout: Number(b.payout), multiplier: Number(b.multiplier) }));
  const claimed = new Set((claims ?? []).map((c: any) => c.idx));
  const quests = defs.map((q, i) => ({ id: q.id, label: q.label, reward: q.reward, goal: questGoal(q), progress: questProgress(q, rows), claimed: claimed.has(i) }));
  const streak = Number(w?.quest_streak ?? 0);
  const last = (w?.last_quest_day as string | null) ?? null;
  const upcoming = nextStreak(streak, last, day);
  return {
    day, quests, bonusClaimed: claimed.has(99), streak: last === day ? streak : (upcoming === 1 ? 0 : streak),
    nextBonus: streakBonus(last === day ? streak : upcoming), nextStreak: last === day ? streak : upcoming,
    resetsAt: Date.parse(dayStartIso(day)) + 86_400_000, serverNow: Date.now(),
  };
}
export async function getQuests(userId: string) {
  await assertActive(userId);
  return questState(userId);
}
export async function claimQuest(userId: string, idx: number) {
  await assertActive(userId);
  const st = await questState(userId);
  let amount = 0;
  if (idx === 99) {
    if (!st.quests.every((q) => q.claimed)) fail("Claim all 3 quests first");
    if (st.bonusClaimed) fail("Streak bonus already claimed today");
    amount = st.nextBonus;
  } else {
    const q = st.quests[idx] ?? fail("Unknown quest");
    if (q.claimed) fail("Already claimed");
    if (q.progress < q.goal) fail("Quest isn't finished yet");
    amount = q.reward;
  }
  const { error } = await db.from("quest_claims").insert({ user_id: userId, day: st.day, idx, amount });
  if (error) fail("Already claimed");
  if (idx === 99) await db.from("wallets").update({ quest_streak: st.nextStreak, last_quest_day: st.day }).eq("user_id", userId);
  const balance = await credit(userId, amount);
  return { amount, balance: Number(balance), state: await questState(userId) };
}

// ---------------- Admin: delete account ----------------
export async function adminDeleteUser(callerId: string, targetId: string) {
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin");
  if (!roles || roles.length === 0) fail("Admins only");
  if (callerId === targetId) fail("You cannot delete your own account");
  const { data: target } = await db.from("profiles").select("username").eq("id", targetId).maybeSingle();
  if (!target) fail("Player not found");
  if (target.username.toLowerCase() === "keno") fail("The owner account cannot be deleted");
  const { data: tRoles } = await db.from("user_roles").select("role").eq("user_id", targetId).eq("role", "admin");
  if (tRoles && tRoles.length > 0) fail("Remove their admin first");
  const { error } = await db.auth.admin.deleteUser(targetId);
  if (error) fail("Could not delete this account");
  return { ok: true };
}

// ---------------- Crash (shared rounds) ----------------
type Round = { id: number; seq: number; crash_point: number; server_seed: string; seed_hash: string; starts_at: string; ends_at: string; settled: boolean };
const t = (iso: string) => new Date(iso).getTime();

async function latestRound(): Promise<Round | null> {
  const { data } = await db.from("crash_rounds").select("*").order("seq", { ascending: false }).limit(1).maybeSingle();
  return (data as any) ?? null;
}
async function createRound(prevSeq: number): Promise<Round> {
  const seq = prevSeq + 1;
  const ss = randomHex(32);
  const cp = L.limboResult((await floats(ss, "crash", seq, 1))[0]);
  const starts = Date.now() + CRASH_BET_MS;
  const ends = starts + Math.max(0, L.crashTimeFor(cp));
  const { data } = await db.from("crash_rounds").insert({
    seq, crash_point: cp, server_seed: ss, seed_hash: await sha256Hex(ss),
    starts_at: new Date(starts).toISOString(), ends_at: new Date(ends).toISOString(),
  }).select().maybeSingle();
  if (data) return data as any;
  return (await latestRound())!; // someone else created it first
}
async function settleBet(r: Round, b: any, cashedAt: number | null) {
  const payout = cashedAt ? L.floor2(Number(b.wager) * cashedAt) : 0;
  const { data } = await db.from("crash_bets").update({ settled: true, cashed_at: cashedAt, payout })
    .eq("id", b.id).eq("settled", false).select("id").maybeSingle();
  if (!data) return null;
  return settleSession(b.user_id, "crash", Number(b.wager), payout);
}
async function settleRound(r: Round, now: number) {
  const ended = now >= t(r.ends_at);
  const m = now < t(r.starts_at) ? 1 : L.crashMultAt(now - t(r.starts_at));
  if (!ended) {
    // pay auto cash-outs that have been reached
    const { data: due } = await db.from("crash_bets").select("*").eq("round_id", r.id).eq("settled", false).not("auto", "is", null).lte("auto", m);
    for (const b of due ?? []) if (Number(b.auto) <= Number(r.crash_point)) await settleBet(r, b, Number(b.auto));
    return;
  }
  if (r.settled) return;
  const { data: claim } = await db.from("crash_rounds").update({ settled: true }).eq("id", r.id).eq("settled", false).select("id").maybeSingle();
  if (!claim) return;
  const { data: open } = await db.from("crash_bets").select("*").eq("round_id", r.id).eq("settled", false);
  for (const b of open ?? []) {
    const win = b.auto && Number(b.auto) <= Number(r.crash_point);
    await settleBet(r, b, win ? Number(b.auto) : null);
  }
}
async function currentRound(): Promise<Round> {
  let r = await latestRound();
  const now = Date.now();
  if (r) await settleRound(r, now);
  if (!r || now >= t(r.ends_at) + CRASH_COOLDOWN_MS) {
    r = await createRound(r?.seq ?? 0);
    if (!r) fail("Busy, try again");
  }
  return r;
}

export async function crashState(userId: string) {
  const r = await currentRound();
  const now = Date.now();
  const crashed = now >= t(r.ends_at);
  const phase = now < t(r.starts_at) ? "betting" : crashed ? "crashed" : "running";
  const [{ data: bets }, { data: hist }] = await Promise.all([
    db.from("crash_bets").select("user_id, username, wager, auto, cashed_at, payout, settled").eq("round_id", r.id).order("wager", { ascending: false }).limit(100),
    db.from("crash_rounds").select("seq, crash_point, seed_hash, server_seed").lt("ends_at", new Date(now).toISOString()).order("seq", { ascending: false }).limit(14),
  ]);
  const list = (bets ?? []).map((b: any) => ({
    userId: b.user_id, username: b.username, wager: Number(b.wager),
    // auto targets stay private until settled so nobody can read others' plans
    cashedAt: b.settled && b.cashed_at ? Number(b.cashed_at) : null, payout: Number(b.payout), settled: b.settled,
  }));
  const mine = (bets ?? []).find((b: any) => b.user_id === userId);
  return {
    serverNow: now,
    round: {
      seq: r.seq, hash: r.seed_hash, startsAt: t(r.starts_at), phase,
      crashPoint: crashed ? Number(r.crash_point) : null, endsAt: crashed ? t(r.ends_at) : null,
      serverSeed: crashed ? r.server_seed : null,
    },
    bets: list,
    me: mine ? { wager: Number(mine.wager), auto: mine.auto ? Number(mine.auto) : null, cashedAt: mine.cashed_at ? Number(mine.cashed_at) : null, payout: Number(mine.payout), settled: mine.settled } : null,
    history: (hist ?? []).map((h: any) => ({ seq: h.seq, crashPoint: Number(h.crash_point), hash: h.seed_hash, serverSeed: h.server_seed })),
  };
}

export async function crashBet(userId: string, wagerIn: number, autoIn: number | null) {
  const prof = await assertActive(userId);
  void prof;
  const wager = Math.floor(Number(wagerIn) * 100) / 100;
  if (!Number.isFinite(wager) || wager < 1) fail("Minimum bet is 1");
  if (wager > 1_000_000_000) fail("Bet is too large");
  const auto = autoIn != null && Number.isFinite(Number(autoIn)) && Number(autoIn) >= 1.01 ? Math.round(Number(autoIn) * 100) / 100 : null;
  const r = await currentRound();
  if (Date.now() >= t(r.starts_at) - 250) fail("This round already launched, wait for the next one");
  const { data: name } = await db.from("profiles").select("username").eq("id", userId).single();
  const balance = await debit(userId, wager);
  const { error } = await db.from("crash_bets").insert({ round_id: r.id, user_id: userId, username: name?.username ?? "player", wager, auto });
  if (error) {
    await credit(userId, wager);
    fail("You already have a bet in this round");
  }
  return { balance: Number(balance), state: await crashState(userId) };
}

export async function crashCashout(userId: string) {
  const r = await latestRound();
  if (!r) fail("No round running");
  const now = Date.now();
  if (now < t(r.starts_at)) fail("The round hasn't launched yet");
  const { data: b } = await db.from("crash_bets").select("*").eq("round_id", r.id).eq("user_id", userId).maybeSingle();
  if (!b || b.settled) fail("You have no active bet");
  if (now >= t(r.ends_at)) {
    await settleRound(r, now);
    fail("Too late, it crashed!");
  }
  const m = L.crashMultAt(now - t(r.starts_at));
  const at = b.auto && Number(b.auto) <= m ? Number(b.auto) : Math.min(m, Number(r.crash_point));
  const balance = await settleBet(r, b, at);
  if (balance == null) fail("Already settled");
  return { balance: Number(balance), cashedAt: at, payout: L.floor2(Number(b.wager) * at), state: await crashState(userId) };
}
