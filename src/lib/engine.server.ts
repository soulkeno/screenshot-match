/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import { floats, randomHex, sha256Hex } from "@/lib/fair";
import * as L from "@/lib/games/logic";

type Fair = { hash: string; clientSeed: string; nonce: number };
type SeedUse = { ss: string; cs: string; n: number; hash: string };

const MIN_BET = 1;
const MAX_BET = 1_000_000_000;

function fail(msg: string): never {
  throw new Error(msg);
}
function cleanWager(w: unknown): number {
  const n = Math.floor(Number(w) * 100) / 100;
  if (!Number.isFinite(n) || n < MIN_BET) fail(`Minimum bet is ${MIN_BET}`);
  if (n > MAX_BET) fail("Bet is too large");
  return n;
}
async function rpc<T = any>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (db.rpc as any)(fn, args);
  if (error) fail(error.message);
  return data as T;
}
const debit = (u: string, a: number) => rpc<number>("wallet_debit", { p_user: u, p_amount: a });
const credit = (u: string, a: number) => rpc<number>("wallet_credit", { p_user: u, p_amount: a });
const settleSession = (u: string, g: string, w: number, p: number) => rpc<number>("settle_session", { p_user: u, p_game: g, p_wager: w, p_payout: p });
const settleInstant = (u: string, g: string, w: number, p: number) => rpc<number>("settle_instant", { p_user: u, p_game: g, p_wager: w, p_payout: p });

async function assertNotBanned(userId: string) {
  const { data } = await db.from("profiles").select("banned_until").eq("id", userId).single();
  if (data?.banned_until && new Date(data.banned_until) > new Date()) fail("Your account is banned");
}

// ---------------- Fairness ----------------
async function ensureSeed(userId: string) {
  const { data } = await db.from("fair_seeds").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data;
  const ss = randomHex(32);
  const row = { user_id: userId, server_seed: ss, server_seed_hash: await sha256Hex(ss), client_seed: randomHex(8), nonce: 0 };
  const { data: ins } = await db.from("fair_seeds").insert(row).select().maybeSingle();
  if (ins) return ins;
  const { data: again } = await db.from("fair_seeds").select("*").eq("user_id", userId).single();
  return again!;
}
async function useNonce(userId: string): Promise<SeedUse> {
  for (let i = 0; i < 5; i++) {
    const s = await ensureSeed(userId);
    const { data } = await db.from("fair_seeds").update({ nonce: s.nonce + 1 }).eq("user_id", userId).eq("nonce", s.nonce).select("user_id").maybeSingle();
    if (data) return { ss: s.server_seed, cs: s.client_seed, n: s.nonce, hash: s.server_seed_hash };
  }
  fail("Busy, try again");
}
const fairOf = (s: SeedUse): Fair => ({ hash: s.hash, clientSeed: s.cs, nonce: s.n });

export async function getFairness(userId: string) {
  const s = await ensureSeed(userId);
  return {
    hash: s.server_seed_hash, clientSeed: s.client_seed, nonce: s.nonce,
    prev: s.prev_server_seed ? { serverSeed: s.prev_server_seed, hash: s.prev_server_seed_hash, clientSeed: s.prev_client_seed, nonce: s.prev_nonce } : null,
  };
}
export async function rotateSeed(userId: string, clientSeed?: string) {
  const s = await ensureSeed(userId);
  const cs = (clientSeed ?? "").trim().slice(0, 64) || randomHex(8);
  const ss = randomHex(32);
  await db.from("fair_seeds").update({
    prev_server_seed: s.server_seed, prev_server_seed_hash: s.server_seed_hash, prev_client_seed: s.client_seed, prev_nonce: s.nonce,
    server_seed: ss, server_seed_hash: await sha256Hex(ss), client_seed: cs, nonce: 0, updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return getFairness(userId);
}

// ---------------- Instant games ----------------
export async function playInstant(userId: string, game: string, wagerIn: number, p: any) {
  p = p ?? {};
  let wager = 0;
  let payout = 0;
  let result: any = {};
  // Validate inputs before consuming a nonce
  if (game === "roulette") {
    const bets: L.RouletteBet[] = Array.isArray(p.bets) ? p.bets : [];
    if (!bets.length || bets.length > 60) fail("Place at least one chip");
    const kinds = ["straight", "red", "black", "odd", "even", "low", "high", "dozen", "column"];
    for (const b of bets) {
      if (!kinds.includes(b.kind)) fail("Invalid bet");
      if (b.kind === "straight" && !(Number.isInteger(b.value) && b.value! >= 0 && b.value! <= 36)) fail("Invalid number");
      if ((b.kind === "dozen" || b.kind === "column") && ![1, 2, 3].includes(b.value as number)) fail("Invalid bet");
      b.amount = cleanWager(b.amount);
    }
    wager = cleanWager(bets.reduce((s, b) => s + b.amount, 0));
    p.bets = bets;
  } else if (game === "baccarat") {
    const amts = ["player", "banker", "tie"].map((k) => Math.max(0, Math.floor(Number(p[k] ?? 0) * 100) / 100));
    wager = cleanWager(amts[0] + amts[1] + amts[2]);
    p.player = amts[0]; p.banker = amts[1]; p.tie = amts[2];
  } else if (game === "cases") {
    const def = L.CASES.find((c) => c.id === p.caseId) ?? fail("Unknown case");
    wager = def.price;
  } else {
    wager = cleanWager(wagerIn);
  }
  const seed = await useNonce(userId);
  const f = (count: number) => floats(seed.ss, seed.cs, seed.n, count);

  switch (game) {
    case "dice": {
      const target = Math.min(98, Math.max(2, Math.round(Number(p.target) * 100) / 100));
      const over = !!p.over;
      const roll = L.diceRoll((await f(1))[0]);
      const win = L.diceWin(roll, target, over);
      const mult = L.diceMultiplier(target, over);
      payout = win ? L.floor2(wager * mult) : 0;
      result = { roll, target, over, win, multiplier: mult };
      break;
    }
    case "limbo": {
      const target = Math.min(1_000_000, Math.max(1.01, Math.round(Number(p.target) * 100) / 100));
      const r = L.limboResult((await f(1))[0]);
      const win = r >= target;
      payout = win ? L.floor2(wager * target) : 0;
      result = { result: r, target, win };
      break;
    }
    case "coinflip": {
      const side: L.CoinSide = p.side === "tails" ? "tails" : "heads";
      const r = L.coinResult((await f(1))[0]);
      payout = r === side ? L.floor2(wager * L.COINFLIP_MULT) : 0;
      result = { side, result: r, win: r === side };
      break;
    }
    case "rps": {
      const choice: L.RPS = L.RPS_LIST.includes(p.choice) ? p.choice : "rock";
      const house = L.rpsHouse((await f(1))[0]);
      const outcome = L.rpsOutcome(choice, house);
      payout = outcome === "win" ? L.floor2(wager * L.RPS_MULT) : outcome === "tie" ? wager : 0;
      result = { choice, house, outcome };
      break;
    }
    case "roulette": {
      const n = L.rouletteNumber((await f(1))[0]);
      payout = L.floor2((p.bets as L.RouletteBet[]).reduce((s, b) => s + b.amount * L.rouletteBetMult(b, n), 0));
      result = { number: n, color: L.rouletteColor(n) };
      break;
    }
    case "plinko": {
      const rows = [8, 12, 16].includes(Number(p.rows)) ? Number(p.rows) : 16;
      const risk: L.PlinkoRisk = ["low", "medium", "high"].includes(p.risk) ? p.risk : "medium";
      const path = L.plinkoPath(await f(rows), rows);
      const bucket = path.reduce<number>((a, b) => a + b, 0);
      const mult = L.PLINKO[rows][risk][bucket];
      payout = L.floor2(wager * mult);
      result = { rows, risk, path, bucket, multiplier: mult };
      break;
    }
    case "keno": {
      const picks: number[] = Array.from(new Set<number>((p.picks ?? []).map(Number))).filter((x) => Number.isInteger(x) && x >= 1 && x <= 40);
      if (picks.length < 1 || picks.length > 10) fail("Pick 1 to 10 numbers");
      const draws = L.kenoDraw(await f(10));
      const hits = picks.filter((x) => draws.includes(x)).length;
      const mult = L.KENO_PAYOUTS[picks.length][hits] ?? 0;
      payout = L.floor2(wager * mult);
      result = { picks, draws, hits, multiplier: mult };
      break;
    }
    case "baccarat": {
      const d = L.baccaratDeal(await f(6));
      if (d.winner === "player") payout = p.player * 2;
      else if (d.winner === "banker") payout = p.banker * 1.95;
      else payout = p.tie * 9 + p.player + p.banker;
      payout = L.floor2(payout);
      result = d;
      break;
    }
    case "upgrader": {
      const mult = Math.min(1000, Math.max(1.01, Math.round(Number(p.multiplier) * 100) / 100));
      const roll = (await f(1))[0];
      const win = L.upgraderWin(roll, mult);
      payout = win ? L.floor2(wager * mult) : 0;
      result = { multiplier: mult, chance: L.upgraderChance(mult), roll, win };
      break;
    }
    case "cases": {
      const def = L.CASES.find((c) => c.id === p.caseId)!;
      const item = L.caseRoll((await f(1))[0], def);
      payout = L.floor2(def.price * item.mult);
      result = { caseId: def.id, item };
      break;
    }
    case "slots": {
      const s = L.slotSpin(await f(15));
      payout = L.floor2(wager * s.mult);
      result = s;
      break;
    }
    default:
      fail("Unknown game");
  }
  const balance = await settleInstant(userId, game, wager, payout);
  return { result, wager, payout, multiplier: wager > 0 ? payout / wager : 0, balance: Number(balance), fair: fairOf(seed) };
}

// ---------------- Session games ----------------
type Session = { id: string; user_id: string; game: string; wager: number; state: any; status: string };
const SESSION_GAMES = ["mines", "towers", "hilo", "blackjack", "snakes"]; // crash now runs as shared rounds in features.server.ts

// Fast in-memory cache for ultra-low latency tile reveals and actions
const activeSessionsCache = new Map<string, Session>();

async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data } = await db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

async function getActive(userId: string, game: string): Promise<Session | null> {
  const key = `${userId}:${game}`;
  const cached = activeSessionsCache.get(key);
  if (cached && cached.status === "active") return cached;

  const { data } = await db.from("game_sessions").select("*").eq("user_id", userId).eq("game", game).eq("status", "active").maybeSingle();
  if (data) {
    const s = data as any as Session;
    activeSessionsCache.set(key, s);
    return s;
  }
  return null;
}

async function saveState(s: Session, status = "active") {
  s.status = status;
  const key = `${s.user_id}:${s.game}`;
  if (status === "active") {
    activeSessionsCache.set(key, s);
    // Asynchronous non-blocking save for maximum gameplay speed
    void db.from("game_sessions").update({ state: s.state, status, updated_at: new Date().toISOString() }).eq("id", s.id);
  } else {
    activeSessionsCache.delete(key);
    await db.from("game_sessions").update({ state: s.state, status, updated_at: new Date().toISOString() }).eq("id", s.id);
  }
}

async function cursorFloat(s: Session, count: number) {
  const c = s.state.cursor ?? 0;
  s.state.cursor = c + count;
  return floats(s.state.seed.ss, s.state.seed.cs, s.state.seed.n, count, c);
}

async function finish(s: Session, payout: number, status: "won" | "lost") {
  s.status = status;
  s.state.payout = payout;
  s.state.ended = status;
  await saveState(s, status);
  const balance = await settleSession(s.user_id, s.game, Number(s.wager) + Number(s.state.extraWager ?? 0), payout);
  return Number(balance);
}

function view(s: Session) {
  const st = s.state;
  const ended = s.status !== "active";
  const isTroll = Boolean(st.trollMode);
  const base: any = { id: s.id, game: s.game, wager: Number(s.wager), status: s.status, payout: st.payout ?? 0, fair: { hash: st.seed.hash, clientSeed: st.seed.cs, nonce: st.seed.n } };
  switch (s.game) {
    case "mines":
      return {
        ...base,
        mines: st.mines,
        revealed: st.revealed,
        multiplier: L.minesMultiplier(st.mines, st.revealed.length),
        next: L.minesMultiplier(st.mines, st.revealed.length + 1),
        minePositions: ended ? st.minePositions : undefined,
        trollMines: isTroll ? st.minePositions : undefined,
        hit: st.hit
      };
    case "towers":
      return {
        ...base,
        difficulty: st.difficulty,
        level: st.level,
        picks: st.picks,
        multiplier: L.towerMultiplier(st.difficulty, st.level),
        next: L.towerMultiplier(st.difficulty, st.level + 1),
        layout: ended ? st.layout : undefined,
        trollLayout: isTroll ? st.layout : undefined
      };
    case "hilo":
      return { ...base, cards: st.cards, history: st.history, multiplier: L.floor2(st.multiplier), trollNext: isTroll ? st.cards[st.cards.length - 1] : undefined };
    case "blackjack":
      return { ...base, hands: st.hands, active: st.active, dealer: ended || st.dealerRevealed ? st.dealer : [st.dealer[0]], dealerHidden: !(ended || st.dealerRevealed), results: st.results, extraWager: st.extraWager ?? 0, trollDealer: isTroll ? st.dealer : undefined };
    case "snakes":
      return { ...base, difficulty: st.difficulty, pos: st.pos, rolls: st.rolls, multiplier: L.floor2(st.multiplier) };
    case "crash":
      return { ...base, startedAt: st.startedAt, serverNow: Date.now(), auto: st.auto, crashPoint: ended ? st.crashPoint : undefined, cashedAt: st.cashedAt, trollCrashPoint: isTroll ? st.crashPoint : undefined };
  }
  return base;
}

export async function sessionResume(userId: string, game: string) {
  if (!SESSION_GAMES.includes(game)) fail("Unknown game");
  const s = await getActive(userId, game);
  if (!s) return { session: null };
  if (game === "crash") return crashCheck(s);
  return { session: view(s) };
}

export async function sessionStart(userId: string, game: string, wagerIn: number, p: any) {
  if (!SESSION_GAMES.includes(game)) fail("Unknown game");
  p = p ?? {};
  const wager = cleanWager(wagerIn);
  await assertNotBanned(userId);
  const existing = await getActive(userId, game);
  if (existing) {
    if (game === "crash") {
      const r = await crashCheck(existing);
      if (r.session?.status === "active") fail("Your current round is still running");
    } else fail("Finish your current game first");
  }
  const seed = await useNonce(userId);
  const isAdmin = await checkIsAdmin(userId);
  const state: any = { seed, cursor: 0, trollMode: isAdmin && Boolean(p.trollMode || p.rigged || p.xray) };
  let immediate: ((s: Session) => Promise<any>) | null = null;
  switch (game) {
    case "mines": {
      const mines = Math.min(24, Math.max(1, Math.floor(Number(p.mines) || 3)));
      state.mines = mines;
      state.minePositions = L.minesPositions(await floats(seed.ss, seed.cs, seed.n, mines), mines);
      state.revealed = [];
      state.cursor = mines;
      break;
    }
    case "towers": {
      const d: L.TowerDiff = Object.keys(L.TOWERS).includes(p.difficulty) ? p.difficulty : "easy";
      const bad = L.TOWERS[d].cols - L.TOWERS[d].safe;
      state.difficulty = d;
      state.layout = L.towerLayout(await floats(seed.ss, seed.cs, seed.n, bad * L.TOWER_LEVELS), d);
      state.level = 0;
      state.picks = [];
      break;
    }
    case "hilo": {
      state.cards = [L.cardFrom((await floats(seed.ss, seed.cs, seed.n, 1))[0])];
      state.cursor = 1;
      state.history = [];
      state.multiplier = 1;
      state.correct = 0;
      break;
    }
    case "snakes": {
      state.difficulty = Object.keys(L.SNAKE_BOARDS).includes(p.difficulty) ? p.difficulty : "easy";
      state.pos = 0;
      state.rolls = [];
      state.multiplier = 1;
      break;
    }
    case "crash": {
      state.crashPoint = L.limboResult((await floats(seed.ss, seed.cs, seed.n, 1))[0]);
      const auto = Number(p.auto);
      state.auto = Number.isFinite(auto) && auto >= 1.01 ? Math.round(auto * 100) / 100 : null;
      state.startedAt = Date.now() + 800;
      break;
    }
    case "blackjack": {
      const fs = await floats(seed.ss, seed.cs, seed.n, 4);
      state.cursor = 4;
      const [p1, d1, p2, d2] = fs.map(L.cardFrom);
      state.hands = [{ cards: [p1, p2], bet: wager, done: false, doubled: false }];
      state.dealer = [d1, d2];
      state.active = 0;
      state.extraWager = 0;
      if (L.isBlackjack([p1, p2]) || L.isBlackjack([d1, d2])) immediate = bjSettle;
      break;
    }
  }
  const balanceAfterDebit = await debit(userId, wager);
  const { data, error } = await db.from("game_sessions").insert({ user_id: userId, game, wager, state, status: "active" }).select().single();
  if (error || !data) {
    await credit(userId, wager);
    fail("Finish your current game first");
  }
  const s = data as any as Session;
  activeSessionsCache.set(`${userId}:${game}`, s);
  if (immediate) return immediate(s);
  return { session: view(s), balance: Number(balanceAfterDebit) };
}

export async function sessionAction(userId: string, game: string, action: string, p: any) {
  const s = await getActive(userId, game);
  if (!s) fail("No active game");
  p = p ?? {};
  const st = s.state;
  switch (game) {
    case "mines": {
      if (action === "reveal") {
        const tile = Math.floor(Number(p.tile));
        if (!(tile >= 0 && tile < 25) || st.revealed.includes(tile)) fail("Invalid tile");
        if (st.minePositions.includes(tile)) {
          st.hit = tile;
          const balance = await finish(s, 0, "lost");
          return { session: view(s), balance };
        }
        st.revealed.push(tile);
        if (st.revealed.length === 25 - st.mines) {
          const payout = L.floor2(Number(s.wager) * L.minesMultiplier(st.mines, st.revealed.length));
          const balance = await finish(s, payout, "won");
          return { session: view(s), balance };
        }
        await saveState(s);
        return { session: view(s) };
      }
      if (action === "cashout") {
        if (!st.revealed.length) fail("Reveal at least one tile");
        const payout = L.floor2(Number(s.wager) * L.minesMultiplier(st.mines, st.revealed.length));
        const balance = await finish(s, payout, "won");
        return { session: view(s), balance };
      }
      break;
    }
    case "towers": {
      if (action === "pick") {
        const col = Math.floor(Number(p.col));
        const { cols } = L.TOWERS[st.difficulty as L.TowerDiff];
        if (!(col >= 0 && col < cols)) fail("Invalid tile");
        st.picks.push(col);
        if (st.layout[st.level].includes(col)) {
          const balance = await finish(s, 0, "lost");
          return { session: view(s), balance };
        }
        st.level++;
        if (st.level === L.TOWER_LEVELS) {
          const payout = L.floor2(Number(s.wager) * L.towerMultiplier(st.difficulty, st.level));
          const balance = await finish(s, payout, "won");
          return { session: view(s), balance };
        }
        await saveState(s);
        return { session: view(s) };
      }
      if (action === "cashout") {
        if (st.level < 1) fail("Climb at least one level");
        const payout = L.floor2(Number(s.wager) * L.towerMultiplier(st.difficulty, st.level));
        const balance = await finish(s, payout, "won");
        return { session: view(s), balance };
      }
      break;
    }
    case "hilo": {
      const cur = st.cards[st.cards.length - 1] as L.Card;
      if (action === "skip" || action === "hi" || action === "lo") {
        if (st.cards.length > 200) fail("Round too long, please cash out");
        const next = L.cardFrom((await cursorFloat(s, 1))[0]);
        st.cards.push(next);
        if (action === "skip") {
          st.history.push({ guess: "skip", card: next, ok: true, mult: st.multiplier });
          await saveState(s);
          return { session: view(s) };
        }
        const g = action as L.HiloGuess;
        const ok = L.hiloWins(cur.rank, next.rank, g);
        if (!ok) {
          st.history.push({ guess: g, card: next, ok: false, mult: 0 });
          const balance = await finish(s, 0, "lost");
          return { session: view(s), balance };
        }
        st.multiplier = st.multiplier * L.hiloStepMult(cur.rank, g);
        st.correct++;
        st.history.push({ guess: g, card: next, ok: true, mult: L.floor2(st.multiplier) });
        await saveState(s);
        return { session: view(s) };
      }
      if (action === "cashout") {
        if (!st.correct) fail("Make at least one correct guess");
        const payout = L.floor2(Number(s.wager) * L.floor2(st.multiplier));
        const balance = await finish(s, payout, "won");
        return { session: view(s), balance };
      }
      break;
    }
    case "snakes": {
      if (action === "roll") {
        const [a, b] = (await cursorFloat(s, 2)).map(L.diceFace);
        const board = L.SNAKE_BOARDS[st.difficulty as L.SnakeDiff];
        const from = st.pos;
        st.pos = (st.pos + a + b) % 12;
        const val = board[st.pos];
        st.rolls.push({ dice: [a, b], from, to: st.pos, value: val });
        if (val === 0) {
          st.multiplier = 0;
          const balance = await finish(s, 0, "lost");
          return { session: view(s), balance };
        }
        st.multiplier *= val;
        if (st.rolls.length >= 50) {
          const payout = L.floor2(Number(s.wager) * L.floor2(st.multiplier));
          const balance = await finish(s, payout, "won");
          return { session: view(s), balance };
        }
        await saveState(s);
        return { session: view(s) };
      }
      if (action === "cashout") {
        if (!st.rolls.length) fail("Roll at least once");
        const payout = L.floor2(Number(s.wager) * L.floor2(st.multiplier));
        const balance = await finish(s, payout, payout >= Number(s.wager) ? "won" : "lost");
        return { session: view(s), balance };
      }
      break;
    }
    case "crash": {
      if (action === "check") return crashCheck(s);
      if (action === "cashout") return crashCashout(s);
      break;
    }
    case "blackjack":
      return bjAction(s, userId, action);
  }
  fail("Invalid action");
}

// ---- Crash ----
async function crashCheck(s: Session) {
  const st = s.state;
  const elapsed = Date.now() - st.startedAt;
  const m = elapsed > 0 ? L.crashMultAt(elapsed) : 1;
  if (st.auto && st.auto <= st.crashPoint && m >= st.auto) {
    st.cashedAt = st.auto;
    const balance = await finish(s, L.floor2(Number(s.wager) * st.auto), "won");
    return { session: view(s), balance };
  }
  if (m >= st.crashPoint) {
    const balance = await finish(s, 0, "lost");
    return { session: view(s), balance };
  }
  return { session: view(s) };
}
async function crashCashout(s: Session) {
  const st = s.state;
  const elapsed = Date.now() - st.startedAt;
  if (elapsed < 0) fail("Round hasn't started yet");
  const m = L.crashMultAt(elapsed);
  if (st.auto && st.auto <= st.crashPoint && m >= st.auto) {
    st.cashedAt = st.auto;
    const balance = await finish(s, L.floor2(Number(s.wager) * st.auto), "won");
    return { session: view(s), balance };
  }
  if (m >= st.crashPoint) {
    const balance = await finish(s, 0, "lost");
    return { session: view(s), balance };
  }
  st.cashedAt = m;
  const balance = await finish(s, L.floor2(Number(s.wager) * m), "won");
  return { session: view(s), balance };
}

// ---- Blackjack ----
async function bjDraw(s: Session) {
  return L.cardFrom((await cursorFloat(s, 1))[0]);
}
async function bjSettle(s: Session) {
  const st = s.state;
  st.dealerRevealed = true;
  const dealerBJ = L.isBlackjack(st.dealer);
  const anyLive = st.hands.some((h: any) => L.bjValue(h.cards).total <= 21);
  const playerBJ = st.hands.length === 1 && L.isBlackjack(st.hands[0].cards) && !st.split;
  if (anyLive && !dealerBJ && !playerBJ) {
    while (L.bjValue(st.dealer).total < 17) st.dealer.push(await bjDraw(s));
  }
  const dv = L.bjValue(st.dealer).total;
  let payout = 0;
  st.results = st.hands.map((h: any) => {
    const pv = L.bjValue(h.cards).total;
    const bj = playerBJ;
    let r: string;
    let pay = 0;
    if (pv > 21) r = "bust";
    else if (bj && !dealerBJ) { r = "blackjack"; pay = h.bet * 2.5; }
    else if (dealerBJ && !bj) r = "lose";
    else if (dealerBJ && bj) { r = "push"; pay = h.bet; }
    else if (dv > 21 || pv > dv) { r = "win"; pay = h.bet * 2; }
    else if (pv === dv) { r = "push"; pay = h.bet; }
    else r = "lose";
    payout += pay;
    return r;
  });
  payout = L.floor2(payout);
  const total = Number(s.wager) + Number(st.extraWager ?? 0);
  const balance = await finish(s, payout, payout >= total && payout > 0 ? "won" : "lost");
  return { session: view(s), balance };
}
async function bjAdvance(s: Session) {
  const st = s.state;
  while (st.active < st.hands.length && st.hands[st.active].done) st.active++;
  if (st.active >= st.hands.length) return bjSettle(s);
  await saveState(s);
  return { session: view(s) };
}
async function bjAction(s: Session, userId: string, action: string) {
  const st = s.state;
  const h = st.hands[st.active];
  if (!h) fail("Invalid action");
  if (action === "hit") {
    h.cards.push(await bjDraw(s));
    if (L.bjValue(h.cards).total >= 21) h.done = true;
    return bjAdvance(s);
  }
  if (action === "stand") {
    h.done = true;
    return bjAdvance(s);
  }
  if (action === "double") {
    if (h.cards.length !== 2) fail("You can only double on your first two cards");
    const balance = await debit(userId, h.bet);
    st.extraWager = Number(st.extraWager ?? 0) + h.bet;
    h.bet = h.bet * 2;
    h.doubled = true;
    h.cards.push(await bjDraw(s));
    h.done = true;
    const r: any = await bjAdvance(s);
    return { ...r, balance: r.balance ?? Number(balance) };
  }
  if (action === "split") {
    if (st.split || h.cards.length !== 2 || Math.min(10, h.cards[0].rank) !== Math.min(10, h.cards[1].rank)) fail("You can't split this hand");
    const balance = await debit(userId, h.bet);
    st.extraWager = Number(st.extraWager ?? 0) + h.bet;
    st.split = true;
    const [a, b] = h.cards;
    const aces = a.rank === 1;
    const h1 = { cards: [a, await bjDraw(s)], bet: h.bet, done: aces, doubled: false };
    const h2 = { cards: [b, await bjDraw(s)], bet: h.bet, done: aces, doubled: false };
    if (L.bjValue(h1.cards).total === 21) h1.done = true;
    if (L.bjValue(h2.cards).total === 21) h2.done = true;
    st.hands = [h1, h2];
    st.active = 0;
    const r: any = await bjAdvance(s);
    return { ...r, balance: r.balance ?? Number(balance) };
  }
  fail("Invalid action");
}

// ---------------- PvP ----------------
async function profileName(userId: string) {
  const { data } = await db.from("profiles").select("username").eq("id", userId).single();
  return data?.username ?? "player";
}

export async function pvpCreate(userId: string, kind: string, p: any) {
  p = p ?? {};
  await assertNotBanned(userId);
  const { count } = await db.from("pvp_games").select("id", { count: "exact", head: true }).eq("creator_id", userId).eq("status", "open");
  if ((count ?? 0) >= 3) fail("You can have up to 3 open games");
  let wager = 0;
  const config: any = {};
  if (kind === "coinflip") {
    wager = cleanWager(p.wager);
    config.side = p.side === "tails" ? "tails" : "heads";
  } else if (kind === "duel") {
    wager = cleanWager(p.wager);
    config.mines = Math.min(10, Math.max(1, Math.floor(Number(p.mines) || 3)));
  } else if (kind === "battle") {
    const def = L.CASES.find((c) => c.id === p.caseId) ?? fail("Unknown case");
    config.caseId = def.id;
    config.rounds = Math.min(5, Math.max(1, Math.floor(Number(p.rounds) || 1)));
    wager = def.price * config.rounds;
  } else fail("Unknown mode");
  const ss = randomHex(32);
  await debit(userId, wager);
  const { data, error } = await db.from("pvp_games").insert({
    kind, creator_id: userId, creator_name: await profileName(userId), wager, config, server_seed_hash: await sha256Hex(ss),
  }).select().single();
  if (error || !data) { await credit(userId, wager); fail("Could not create game"); }
  await db.from("pvp_secrets").insert({ game_id: data.id, server_seed: ss });
  return { id: data.id };
}

export async function pvpCancel(userId: string, id: string) {
  const { data } = await db.from("pvp_games").update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id).eq("creator_id", userId).eq("status", "open").select().maybeSingle();
  if (!data) fail("Game can't be cancelled");
  await credit(userId, Number(data.wager));
  return { ok: true };
}

export async function pvpJoin(userId: string, id: string) {
  await assertNotBanned(userId);
  const name = await profileName(userId);
  const { data: g } = await db.from("pvp_games").update({ status: "active", joiner_id: userId, joiner_name: name, updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "open").neq("creator_id", userId).select().maybeSingle();
  if (!g) fail("This game is no longer available");
  try {
    await debit(userId, Number(g.wager));
  } catch (e) {
    await db.from("pvp_games").update({ status: "open", joiner_id: null, joiner_name: null }).eq("id", id);
    throw e;
  }
  const { data: sec } = await db.from("pvp_secrets").select("server_seed").eq("game_id", id).single();
  const ss = sec!.server_seed;
  const wager = Number(g.wager);
  const cfg = g.config as any;
  const now = new Date().toISOString();
  if (g.kind === "coinflip") {
    const res = L.coinResult((await floats(ss, id, 0, 1))[0]);
    const winner = res === cfg.side ? g.creator_id : userId;
    const loser = winner === g.creator_id ? userId : g.creator_id;
    const pot = L.floor2(wager * 2 * L.PVP_RAKE);
    await db.from("pvp_games").update({ status: "done", winner_id: winner, state: { result: res }, server_seed: ss, updated_at: now }).eq("id", id);
    await settleSession(winner, "pvp-coinflip", wager, pot);
    await settleSession(loser, "pvp-coinflip", wager, 0);
    return { id };
  }
  if (g.kind === "battle") {
    const def = L.CASES.find((c) => c.id === cfg.caseId)!;
    const fs = await floats(ss, id, 0, cfg.rounds * 2);
    const rounds = [];
    let t1 = 0, t2 = 0;
    for (let r = 0; r < cfg.rounds; r++) {
      const a = L.caseRoll(fs[r * 2], def);
      const b = L.caseRoll(fs[r * 2 + 1], def);
      t1 += def.price * a.mult; t2 += def.price * b.mult;
      rounds.push({ creator: a, joiner: b });
    }
    t1 = L.floor2(t1); t2 = L.floor2(t2);
    const winner = t1 > t2 ? g.creator_id : t2 > t1 ? userId : null;
    await db.from("pvp_games").update({ status: "done", winner_id: winner, state: { rounds, totals: [t1, t2] }, server_seed: ss, updated_at: now }).eq("id", id);
    if (winner) {
      const loser = winner === g.creator_id ? userId : g.creator_id;
      await settleSession(winner, "case-battles", wager, L.floor2(t1 + t2));
      await settleSession(loser, "case-battles", wager, 0);
    } else {
      await settleSession(g.creator_id, "case-battles", wager, t1);
      await settleSession(userId, "case-battles", wager, t2);
    }
    return { id };
  }
  // duel
  const fs = await floats(ss, id, 0, cfg.mines + 1);
  const mines = L.pickDistinct(fs, L.DUEL_TILES, cfg.mines);
  const first = fs[cfg.mines] < 0.5 ? g.creator_id : userId;
  await db.from("pvp_secrets").update({ secret: { mines } }).eq("game_id", id);
  await db.from("pvp_games").update({ state: { revealed: [], turn: first, turnAt: Date.now() }, updated_at: now }).eq("id", id);
  return { id };
}

async function duelEnd(g: any, winner: string, state: any, ss: string, mines: number[]) {
  const loser = winner === g.creator_id ? g.joiner_id : g.creator_id;
  const wager = Number(g.wager);
  const { data } = await db.from("pvp_games").update({ status: "done", winner_id: winner, state: { ...state, mines }, server_seed: ss, updated_at: new Date().toISOString() })
    .eq("id", g.id).eq("status", "active").select("id").maybeSingle();
  if (!data) return;
  await settleSession(winner, "mines-duel", wager, L.floor2(wager * 2 * L.PVP_RAKE));
  await settleSession(loser, "mines-duel", wager, 0);
}

export async function duelReveal(userId: string, id: string, tile: number) {
  const { data: g } = await db.from("pvp_games").select("*").eq("id", id).single();
  if (!g || g.kind !== "duel" || g.status !== "active") fail("Game is not active");
  const st = g.state as any;
  if (st.turn !== userId) fail("It's not your turn");
  tile = Math.floor(Number(tile));
  if (!(tile >= 0 && tile < 25) || st.revealed.some((r: any) => r.tile === tile)) fail("Invalid tile");
  const { data: sec } = await db.from("pvp_secrets").select("*").eq("game_id", id).single();
  const mines: number[] = (sec!.secret as any).mines;
  const other = userId === g.creator_id ? g.joiner_id : g.creator_id;
  if (mines.includes(tile)) {
    const state = { ...st, revealed: [...st.revealed, { tile, by: userId, mine: true }], turn: null };
    await duelEnd(g, other!, state, sec!.server_seed, mines);
    return { ok: true };
  }
  const state = { ...st, revealed: [...st.revealed, { tile, by: userId, mine: false }], turn: other, turnAt: Date.now() };
  const { data: upd } = await db.from("pvp_games").update({ state, updated_at: new Date().toISOString() }).eq("id", id).eq("updated_at", g.updated_at).select("id").maybeSingle();
  if (!upd) fail("Board changed, try again");
  return { ok: true };
}

export async function duelClaim(userId: string, id: string) {
  const { data: g } = await db.from("pvp_games").select("*").eq("id", id).single();
  if (!g || g.kind !== "duel" || g.status !== "active") fail("Game is not active");
  if (userId !== g.creator_id && userId !== g.joiner_id) fail("Not your game");
  const st = g.state as any;
  if (st.turn === userId) fail("It's your turn");
  if (Date.now() - st.turnAt < 45_000) fail("Opponent still has time");
  const { data: sec } = await db.from("pvp_secrets").select("*").eq("game_id", id).single();
  await duelEnd(g, userId, { ...st, turn: null, timeout: true }, sec!.server_seed, (sec!.secret as any).mines);
  return { ok: true };
}

// ---------------- Account ----------------
export const authEmail = (u: string) => `${u.toLowerCase()}@players.ember-casino.app`;
export async function changeUsername(userId: string, name: string) {
  name = (name ?? "").trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) fail("Usernames are 3-16 letters, numbers or _");
  const { data: me } = await db.from("profiles").select("username").eq("id", userId).single();
  if (me?.username.toLowerCase() === "keno" && name.toLowerCase() !== "keno") fail("The owner account keeps its name");
  if (me?.username.toLowerCase() !== name.toLowerCase()) {
    const { data: taken } = await db.from("profiles").select("id").ilike("username", name).maybeSingle();
    if (taken && taken.id !== userId) fail("That username is taken");
  }
  if (name.toLowerCase() === "keno" && me?.username.toLowerCase() !== "keno") fail("That username is taken");
  const { error: aerr } = await db.auth.admin.updateUserById(userId, { email: authEmail(name), email_confirm: true, user_metadata: { username: name } });
  if (aerr) fail("Could not change username");
  const { error } = await db.from("profiles").update({ username: name }).eq("id", userId);
  if (error) fail("That username is taken");
  return { username: name };
}

// ---------------- Admin ----------------
export async function adminWipeUser(callerId: string, targetUserId: string) {
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin");
  if (!roles || roles.length === 0) fail("Forbidden: Admin access required");

  // Zero balance, vault, rakeback in wallets
  await db.from("wallets").update({ balance: 0, vault: 0, rakeback: 0, updated_at: new Date().toISOString() }).eq("user_id", targetUserId);

  // Reset profile stats
  const { error } = await db.from("profiles").update({
    total_wagered: 0,
    total_payout: 0,
    bets_count: 0,
    wins_count: 0,
    biggest_win: 0,
    biggest_multiplier: 0,
  }).eq("id", targetUserId);

  if (error) fail(error.message);

  // Fetch updated wallet balance
  const { data: w } = await db.from("wallets").select("balance").eq("user_id", targetUserId).maybeSingle();
  return { ok: true, balance: Number(w?.balance ?? 0) };
}

// ---------------- Cosmetics ----------------
export async function buyCosmetic(userId: string, itemId: string, price: number) {
  if (price < 0 || !Number.isFinite(price)) fail("Invalid price");
  if (price > 0) {
    const { data: w } = await db.from("wallets").select("balance").eq("user_id", userId).single();
    if (!w || Number(w.balance) < price) fail("Not enough coins to buy this item");
    await debit(userId, price);
  }
  const { data: updatedW } = await db.from("wallets").select("balance").eq("user_id", userId).single();
  return { ok: true, balance: Number(updatedW?.balance ?? 0) };
}
