// Shared rules for the Lucky Wheel, Daily Quests and Vault interest.
// Used by both the server (which decides outcomes) and the UI (which displays them).

// ---------------- Lucky Wheel ----------------
export type WheelTier = "bronze" | "gold" | "diamond";
export type WheelPrize =
  | { kind: "coins"; amount: number; label: string; weight: number }
  | { kind: "boost"; mult: number; hours: number; label: string; weight: number }
  | { kind: "cosmetic"; pool: string[]; label: string; weight: number };

const FONT_POOL = ["font-orbitron", "font-mono", "font-display", "font-press", "font-cinzel", "font-pacifico"];
const GLOW_POOL = ["glow-emerald", "glow-cyber", "glow-ice", "glow-fire", "glow-void", "glow-aurora", "glow-gold"];

export const WHEEL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const WHEELS: Record<WheelTier, { name: string; minRank: number; prizes: WheelPrize[] }> = {
  bronze: {
    name: "Bronze Wheel",
    minRank: 0,
    prizes: [
      { kind: "coins", amount: 5000, label: "5K", weight: 30 },
      { kind: "boost", mult: 1.5, hours: 1, label: "1.5× Boost 1h", weight: 8 },
      { kind: "coins", amount: 10000, label: "10K", weight: 25 },
      { kind: "coins", amount: 15000, label: "15K", weight: 18 },
      { kind: "cosmetic", pool: FONT_POOL, label: "Rare Font", weight: 2 },
      { kind: "coins", amount: 25000, label: "25K", weight: 10 },
      { kind: "boost", mult: 2, hours: 1, label: "2× Boost 1h", weight: 3 },
      { kind: "coins", amount: 40000, label: "40K", weight: 4 },
    ],
  },
  gold: {
    name: "Gold Wheel",
    minRank: 3,
    prizes: [
      { kind: "coins", amount: 25000, label: "25K", weight: 30 },
      { kind: "boost", mult: 2, hours: 2, label: "2× Boost 2h", weight: 8 },
      { kind: "coins", amount: 50000, label: "50K", weight: 25 },
      { kind: "coins", amount: 100000, label: "100K", weight: 18 },
      { kind: "cosmetic", pool: [...FONT_POOL, ...GLOW_POOL], label: "Rare Cosmetic", weight: 2 },
      { kind: "coins", amount: 250000, label: "250K", weight: 10 },
      { kind: "boost", mult: 3, hours: 1, label: "3× Boost 1h", weight: 3 },
      { kind: "coins", amount: 500000, label: "500K", weight: 4 },
    ],
  },
  diamond: {
    name: "Diamond Wheel",
    minRank: 6,
    prizes: [
      { kind: "coins", amount: 100000, label: "100K", weight: 30 },
      { kind: "boost", mult: 2, hours: 6, label: "2× Boost 6h", weight: 8 },
      { kind: "coins", amount: 250000, label: "250K", weight: 25 },
      { kind: "coins", amount: 500000, label: "500K", weight: 18 },
      { kind: "cosmetic", pool: GLOW_POOL, label: "Mythic Glow", weight: 2 },
      { kind: "coins", amount: 1000000, label: "1M", weight: 10 },
      { kind: "boost", mult: 3, hours: 3, label: "3× Boost 3h", weight: 3 },
      { kind: "coins", amount: 2500000, label: "2.5M", weight: 4 },
    ],
  },
};

export function wheelTierFor(rankIndex: number): WheelTier {
  if (rankIndex >= WHEELS.diamond.minRank) return "diamond";
  if (rankIndex >= WHEELS.gold.minRank) return "gold";
  return "bronze";
}

/** Picks a slice index from a float in [0,1) using the slice weights. */
export function pickSlice(prizes: WheelPrize[], f: number): number {
  const total = prizes.reduce((a, p) => a + p.weight, 0);
  let x = f * total;
  for (let i = 0; i < prizes.length; i++) {
    x -= prizes[i].weight;
    if (x < 0) return i;
  }
  return prizes.length - 1;
}

// ---------------- Daily Quests ----------------
export type QuestDef =
  | { id: string; type: "wager"; game?: string; amount: number; reward: number; label: string }
  | { id: string; type: "mult"; game: string; mult: number; reward: number; label: string }
  | { id: string; type: "wins"; game?: string; count: number; reward: number; label: string }
  | { id: string; type: "bets"; game?: string; count: number; reward: number; label: string };

export const QUEST_POOL: QuestDef[] = [
  { id: "crash-5x", type: "mult", game: "crash", mult: 5, reward: 5000, label: "Hit a 5.00× multiplier on Crash" },
  { id: "duel-3", type: "wins", game: "mines-duel", count: 3, reward: 7500, label: "Win 3 games of Mines Duel" },
  { id: "wager-25k", type: "wager", amount: 25000, reward: 2500, label: "Wager 25,000 Coins" },
  { id: "wager-100k", type: "wager", amount: 100000, reward: 7500, label: "Wager 100,000 Coins" },
  { id: "dice-10k", type: "wager", game: "dice", amount: 10000, reward: 2000, label: "Wager 10,000 Coins on Dice" },
  { id: "bets-50", type: "bets", count: 50, reward: 3000, label: "Place 50 bets" },
  { id: "bj-5", type: "wins", game: "blackjack", count: 5, reward: 4000, label: "Win 5 hands of Blackjack" },
  { id: "limbo-10x", type: "mult", game: "limbo", mult: 10, reward: 5000, label: "Hit a 10.00× multiplier on Limbo" },
  { id: "plinko-3x", type: "mult", game: "plinko", mult: 3, reward: 3000, label: "Hit a 3.00× multiplier on Plinko" },
  { id: "flip-2", type: "wins", game: "pvp-coinflip", count: 2, reward: 4000, label: "Win 2 PVP Coinflips" },
  { id: "mines-3x", type: "mult", game: "mines", mult: 3, reward: 3000, label: "Cash out 3.00× or more on Mines" },
  { id: "wins-10", type: "wins", count: 10, reward: 3500, label: "Win 10 bets on any game" },
  { id: "towers-5", type: "wins", game: "towers", count: 5, reward: 3500, label: "Win 5 games of Towers" },
  { id: "battle-1", type: "wins", game: "case-battles", count: 1, reward: 5000, label: "Win a Case Battle" },
];

export const QUESTS_PER_DAY = 3;
export const STREAK_BASE = 5000;
export const STREAK_CAP = 7;

/** Picks 3 different quests from three floats in [0,1). */
export function pickQuests(fs: number[]): string[] {
  const pool = QUEST_POOL.map((q) => q.id);
  const out: string[] = [];
  for (let i = 0; i < QUESTS_PER_DAY; i++) {
    const idx = Math.min(pool.length - 1, Math.floor((fs[i] ?? 0) * pool.length));
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export type BetRow = { game: string; wager: number; payout: number; multiplier: number };

export function questGoal(q: QuestDef): number {
  return q.type === "wager" ? q.amount : q.type === "mult" ? 1 : q.count;
}

export function questProgress(q: QuestDef, bets: BetRow[]): number {
  const mine = bets.filter((b) => !("game" in q) || !q.game || b.game === q.game);
  let v = 0;
  if (q.type === "wager") v = mine.reduce((a, b) => a + Number(b.wager), 0);
  else if (q.type === "mult") v = mine.some((b) => Number(b.payout) > 0 && Number(b.multiplier) >= q.mult) ? 1 : 0;
  else if (q.type === "wins") v = mine.filter((b) => Number(b.payout) > Number(b.wager)).length;
  else v = mine.length;
  return Math.min(v, questGoal(q));
}

/** New streak after finishing all quests on `day`, given the last day the bonus was claimed. */
export function nextStreak(prevStreak: number, lastDay: string | null, day: string): number {
  if (!lastDay) return 1;
  const diff = Math.round((Date.parse(day + "T00:00:00Z") - Date.parse(lastDay + "T00:00:00Z")) / 86_400_000);
  if (diff === 0) return prevStreak;
  return diff === 1 ? prevStreak + 1 : 1;
}
export const streakBonus = (streak: number) => STREAK_BASE * Math.min(Math.max(streak, 1), STREAK_CAP);

export const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

// ---------------- Vault interest ----------------
/** Daily vault interest. Keep in sync with public.vault_rate() in the database. */
export function vaultRate(rankIndex: number, isVip: boolean): number {
  return Math.min(0.02, 0.01 + rankIndex * 0.00125 + (isVip ? 0.005 : 0));
}

// ---------------- Crash rounds ----------------
export const CRASH_BET_MS = 7000;
export const CRASH_COOLDOWN_MS = 3000;
