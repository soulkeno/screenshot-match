// Pure game math shared by the server (to settle bets) and the browser (to verify results).
export const EDGE = 0.99;
export const floor2 = (n: number) => Math.floor(n * 100 + 1e-9) / 100;

/** Pick `k` distinct items from 0..n-1 using one float per pick. */
export function pickDistinct(fs: number[], n: number, k: number): number[] {
  const pool = Array.from({ length: n }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < k; i++) out.push(pool.splice(Math.floor(fs[i] * pool.length), 1)[0]);
  return out;
}

// ---------- Dice ----------
export const diceRoll = (f: number) => Math.floor(f * 10001) / 100;
export function diceChance(target: number, over: boolean) {
  return over ? 100 - target : target;
}
export function diceMultiplier(target: number, over: boolean) {
  return Math.floor((99 / diceChance(target, over)) * 10000) / 10000;
}
export const diceWin = (roll: number, target: number, over: boolean) => (over ? roll > target : roll < target);

// ---------- Limbo / Crash ----------
export function limboResult(f: number) {
  return Math.min(1_000_000, Math.max(1, Math.floor((EDGE / (1 - f)) * 100) / 100));
}
export const CRASH_RATE = 0.1; // multiplier = e^(rate * seconds)
export const crashMultAt = (ms: number) => Math.floor(Math.exp((CRASH_RATE * ms) / 1000) * 100) / 100;
export const crashTimeFor = (mult: number) => (Math.log(mult) / CRASH_RATE) * 1000;

// ---------- Coinflip ----------
export type CoinSide = "heads" | "tails";
export const coinResult = (f: number): CoinSide => (f < 0.5 ? "heads" : "tails");
export const COINFLIP_MULT = 1.98;

// ---------- Rock paper scissors ----------
export type RPS = "rock" | "paper" | "scissors";
export const RPS_LIST: RPS[] = ["rock", "paper", "scissors"];
export const rpsHouse = (f: number): RPS => RPS_LIST[Math.floor(f * 3)];
export function rpsOutcome(p: RPS, h: RPS): "win" | "lose" | "tie" {
  if (p === h) return "tie";
  if ((p === "rock" && h === "scissors") || (p === "paper" && h === "rock") || (p === "scissors" && h === "paper")) return "win";
  return "lose";
}
export const RPS_MULT = 1.96;

// ---------- Roulette (European) ----------
export const ROULETTE_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const ROULETTE_WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
export type RouletteBetKind = "straight" | "red" | "black" | "odd" | "even" | "low" | "high" | "dozen" | "column";
export type RouletteBet = { kind: RouletteBetKind; value?: number; amount: number };
export const rouletteNumber = (f: number) => Math.floor(f * 37);
export function rouletteColor(n: number): "green" | "red" | "black" {
  return n === 0 ? "green" : ROULETTE_RED.has(n) ? "red" : "black";
}
export function rouletteBetMult(b: RouletteBet, n: number): number {
  switch (b.kind) {
    case "straight": return b.value === n ? 36 : 0;
    case "red": return n > 0 && ROULETTE_RED.has(n) ? 2 : 0;
    case "black": return n > 0 && !ROULETTE_RED.has(n) ? 2 : 0;
    case "odd": return n > 0 && n % 2 === 1 ? 2 : 0;
    case "even": return n > 0 && n % 2 === 0 ? 2 : 0;
    case "low": return n >= 1 && n <= 18 ? 2 : 0;
    case "high": return n >= 19 ? 2 : 0;
    case "dozen": return n > 0 && Math.ceil(n / 12) === b.value ? 3 : 0;
    case "column": return n > 0 && ((n - 1) % 3) + 1 === b.value ? 3 : 0;
  }
}

// ---------- Plinko ----------
export type PlinkoRisk = "low" | "medium" | "high";
export const PLINKO: Record<number, Record<PlinkoRisk, number[]>> = {
  8: {
    low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  16: {
    low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};
export const plinkoPath = (fs: number[], rows: number) => fs.slice(0, rows).map((f) => (f < 0.5 ? 0 : 1));

// ---------- Keno ----------
export const KENO_TILES = 40;
export const KENO_PAYOUTS: Record<number, number[]> = {
  1: [0.7, 1.85],
  2: [0, 2, 3.8],
  3: [0, 1.1, 1.38, 26],
  4: [0, 0, 2.2, 7.9, 90],
  5: [0, 0, 1.5, 4.2, 13, 300],
  6: [0, 0, 1.1, 2, 6.2, 100, 700],
  7: [0, 0, 1.1, 1.6, 3.5, 15, 225, 700],
  8: [0, 0, 1.1, 1.5, 2, 5.5, 39, 100, 800],
  9: [0, 0, 1.1, 1.3, 1.7, 2.5, 7.5, 50, 250, 1000],
  10: [0, 0, 1.1, 1.2, 1.3, 1.8, 3.5, 13, 50, 250, 1000],
};
export const kenoDraw = (fs: number[]) => pickDistinct(fs, KENO_TILES, 10).map((x) => x + 1);

// ---------- Mines ----------
export const MINES_TILES = 25;
export const minesPositions = (fs: number[], mines: number, totalTiles = 25) => pickDistinct(fs, totalTiles, mines);
export function minesMultiplier(mines: number, revealed: number, totalTiles = 25) {
  let m = 1;
  for (let i = 0; i < revealed; i++) m *= (totalTiles - i) / (totalTiles - mines - i);
  return revealed === 0 ? 1 : floor2(m * EDGE);
}

// ---------- Towers ----------
export type TowerDiff = "easy" | "medium" | "hard" | "expert" | "master";
export const TOWERS: Record<TowerDiff, { cols: number; safe: number }> = {
  easy: { cols: 4, safe: 3 },
  medium: { cols: 3, safe: 2 },
  hard: { cols: 2, safe: 1 },
  expert: { cols: 3, safe: 1 },
  master: { cols: 4, safe: 1 },
};
export const TOWER_LEVELS = 8;
export function towerMultiplier(d: TowerDiff, level: number) {
  if (level === 0) return 1;
  const { cols, safe } = TOWERS[d];
  return floor2(EDGE * Math.pow(cols / safe, level));
}
/** For each level, indices of bad tiles. */
export function towerLayout(fs: number[], d: TowerDiff): number[][] {
  const { cols, safe } = TOWERS[d];
  const bad = cols - safe;
  const out: number[][] = [];
  for (let l = 0; l < TOWER_LEVELS; l++) out.push(pickDistinct(fs.slice(l * bad, l * bad + bad), cols, bad));
  return out;
}

// ---------- Cards ----------
export type Card = { rank: number; suit: number }; // rank 1..13 (A..K), suit 0..3 (♠♥♦♣)
export const SUITS = ["♠", "♥", "♦", "♣"];
export const RANK_LABEL = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export function cardFrom(f: number): Card {
  const i = Math.floor(f * 52);
  return { rank: (i % 13) + 1, suit: Math.floor(i / 13) };
}

// ---------- HiLo ----------
export type HiloGuess = "hi" | "lo";
export function hiloChance(rank: number, g: HiloGuess) {
  if (g === "hi") return rank === 13 ? 1 / 13 : rank === 1 ? 12 / 13 : (14 - rank) / 13;
  return rank === 1 ? 1 / 13 : rank === 13 ? 12 / 13 : rank / 13;
}
export function hiloWins(cur: number, next: number, g: HiloGuess) {
  if (g === "hi") return cur === 13 ? next === 13 : cur === 1 ? next > 1 : next >= cur;
  return cur === 1 ? next === 1 : cur === 13 ? next < 13 : next <= cur;
}
export function hiloLabel(rank: number, g: HiloGuess) {
  if (g === "hi") return rank === 13 ? "Same" : rank === 1 ? "Higher" : "Higher or same";
  return rank === 1 ? "Same" : rank === 13 ? "Lower" : "Lower or same";
}
export const hiloStepMult = (rank: number, g: HiloGuess) => EDGE / hiloChance(rank, g);

// ---------- Blackjack ----------
export function bjValue(cards: Card[]) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 1) { aces++; total += 11; } else total += Math.min(10, c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
export const isBlackjack = (cards: Card[]) => cards.length === 2 && bjValue(cards).total === 21;

export function evaluatePerfectPairs(p1: Card, p2: Card): { won: boolean; mult: number; label?: string } {
  if (p1.rank !== p2.rank) return { won: false, mult: 0 };
  const isRed = (s: number) => s === 1 || s === 2;
  if (p1.suit === p2.suit) return { won: true, mult: 25, label: "Perfect Pair (25:1)" };
  if (isRed(p1.suit) === isRed(p2.suit)) return { won: true, mult: 12, label: "Colored Pair (12:1)" };
  return { won: true, mult: 6, label: "Mixed Pair (6:1)" };
}

export function evaluate21Plus3(p1: Card, p2: Card, d1: Card): { won: boolean; mult: number; label?: string } {
  const cards = [p1, p2, d1];
  const suits = cards.map((c) => c.suit);
  const sameSuit = suits[0] === suits[1] && suits[1] === suits[2];
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  const sameRank = ranks[0] === ranks[1] && ranks[1] === ranks[2];

  if (sameRank && sameSuit) return { won: true, mult: 100, label: "Suited Trips (100:1)" };

  let isStraight = false;
  if (ranks[0] + 1 === ranks[1] && ranks[1] + 1 === ranks[2]) isStraight = true;
  if (ranks[0] === 1 && ranks[1] === 12 && ranks[2] === 13) isStraight = true; // A-Q-K

  if (isStraight && sameSuit) return { won: true, mult: 40, label: "Straight Flush (40:1)" };
  if (sameRank) return { won: true, mult: 30, label: "Three of a Kind (30:1)" };
  if (isStraight) return { won: true, mult: 10, label: "Straight (10:1)" };
  if (sameSuit) return { won: true, mult: 5, label: "Flush (5:1)" };

  return { won: false, mult: 0 };
}

// ---------- Baccarat ----------
export const bacValue = (c: Card) => (c.rank >= 10 ? 0 : c.rank);
export const bacTotal = (cs: Card[]) => cs.reduce((s, c) => s + bacValue(c), 0) % 10;
export function baccaratDeal(fs: number[]) {
  const cards = fs.slice(0, 6).map(cardFrom);
  let i = 0;
  const player = [cards[i++], cards[i++]];
  const banker = [cards[i++], cards[i++]];
  const pt = bacTotal(player);
  const bt = bacTotal(banker);
  if (pt < 8 && bt < 8) {
    let p3: Card | null = null;
    if (pt <= 5) { p3 = cards[i++]; player.push(p3); }
    const b = bacTotal(banker);
    let bankerDraws = false;
    if (!p3) bankerDraws = b <= 5;
    else {
      const v = bacValue(p3);
      if (b <= 2) bankerDraws = true;
      else if (b === 3) bankerDraws = v !== 8;
      else if (b === 4) bankerDraws = v >= 2 && v <= 7;
      else if (b === 5) bankerDraws = v >= 4 && v <= 7;
      else if (b === 6) bankerDraws = v === 6 || v === 7;
    }
    if (bankerDraws) banker.push(cards[i++]);
  }
  const p = bacTotal(player);
  const bk = bacTotal(banker);
  return { player, banker, playerTotal: p, bankerTotal: bk, winner: (p > bk ? "player" : bk > p ? "banker" : "tie") as "player" | "banker" | "tie" };
}

// ---------- Upgrader ----------
export const upgraderChance = (mult: number) => EDGE / mult; // 0..1
export const upgraderWin = (f: number, mult: number) => f < upgraderChance(mult);

// ---------- Cases ----------
export type CaseItem = { name: string; mult: number; chance: number; tier: number };
export type CaseDef = { id: string; name: string; price: number; tone: string; items: CaseItem[] };
const ITEMS_A = (names: string[]): CaseItem[] => [
  { name: names[0], mult: 0.2, chance: 45, tier: 0 },
  { name: names[1], mult: 0.5, chance: 25, tier: 1 },
  { name: names[2], mult: 1, chance: 15, tier: 2 },
  { name: names[3], mult: 2, chance: 9, tier: 3 },
  { name: names[4], mult: 4, chance: 4, tier: 4 },
  { name: names[5], mult: 10, chance: 1.7, tier: 5 },
  { name: names[6], mult: 30, chance: 0.3, tier: 6 },
];
const ITEMS_B = (names: string[]): CaseItem[] => [
  { name: names[0], mult: 0.1, chance: 51.95, tier: 0 },
  { name: names[1], mult: 0.6, chance: 24, tier: 1 },
  { name: names[2], mult: 1.5, chance: 14, tier: 2 },
  { name: names[3], mult: 3, chance: 7, tier: 3 },
  { name: names[4], mult: 7, chance: 2.5, tier: 4 },
  { name: names[5], mult: 25, chance: 0.5, tier: 5 },
  { name: names[6], mult: 100, chance: 0.05, tier: 6 },
];
export const CASES: CaseDef[] = [
  { id: "spark", name: "Spark Case", price: 1000, tone: "accent", items: ITEMS_A(["Ash", "Copper Coin", "Silver Coin", "Gold Coin", "Emerald", "Diamond", "Ember Crown"]) },
  { id: "neon", name: "Neon Case", price: 10000, tone: "success", items: ITEMS_B(["Static", "Neon Tube", "Glow Chip", "Laser Core", "Plasma Orb", "Neon Dragon", "Synth Throne"]) },
  { id: "inferno", name: "Inferno Case", price: 100000, tone: "primary", items: ITEMS_A(["Cinder", "Flame Ring", "Blaze Gem", "Phoenix Feather", "Lava Heart", "Inferno Blade", "Sun Core"]) },
  { id: "royal", name: "Royal Case", price: 1000000, tone: "gold", items: ITEMS_B(["Pawn", "Knight", "Bishop", "Rook", "Queen", "King", "Grand Crown"]) },
];
export function caseRoll(f: number, def: CaseDef): CaseItem {
  let acc = 0;
  const x = f * 100;
  for (const it of def.items) { acc += it.chance; if (x < acc) return it; }
  return def.items[0];
}

// ---------- Slots ----------
export const SLOT_SYMBOLS = ["cherry", "lemon", "grape", "bell", "clover", "gem", "seven", "crown"] as const;
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number];
export const SLOT_WEIGHTS: Record<SlotSymbol, number> = { cherry: 26, lemon: 24, grape: 20, bell: 14, clover: 10, gem: 7, seven: 4, crown: 2 };
export const SLOT_PAYS: Record<SlotSymbol, [number, number, number]> = {
  cherry: [1, 2.5, 6],
  lemon: [1.2, 3, 8],
  grape: [1.5, 4, 12],
  bell: [2.5, 7, 25],
  clover: [4, 12, 45],
  gem: [6, 20, 90],
  seven: [12, 50, 250],
  crown: [25, 120, 1000],
};
export const SLOT_LINES: number[][] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
];
export const SLOT_SCALE = 13.2;
function slotPick(f: number): SlotSymbol {
  const total = Object.values(SLOT_WEIGHTS).reduce((a, b) => a + b, 0);
  let x = f * total;
  for (const s of SLOT_SYMBOLS) { x -= SLOT_WEIGHTS[s]; if (x < 0) return s; }
  return "cherry";
}
/** grid[reel][row] */
export function slotSpin(fs: number[]) {
  const grid: SlotSymbol[][] = [];
  for (let r = 0; r < 5; r++) grid.push([0, 1, 2].map((row) => slotPick(fs[r * 3 + row])));
  const wins: { line: number; symbol: SlotSymbol; count: number; mult: number }[] = [];
  SLOT_LINES.forEach((line, li) => {
    const first = grid[0][line[0]];
    let count = 1;
    while (count < 5 && grid[count][line[count]] === first) count++;
    if (count >= 3) wins.push({ line: li, symbol: first, count, mult: (SLOT_PAYS[first][count - 3] * SLOT_SCALE) / SLOT_LINES.length });
  });
  const mult = floor2(wins.reduce((s, w) => s + w.mult, 0));
  return { grid, wins, mult };
}

// ---------- Snakes ----------
export type SnakeDiff = "easy" | "medium" | "hard" | "expert" | "master";
/** 12 tiles around the board; 0 = snake. Tile 0 is the start square. */
export const SNAKE_BOARDS: Record<SnakeDiff, number[]> = {
  easy: [0.86, 0.95, 1.08, 0.86, 1.21, 0.95, 0, 0.95, 1.21, 0.86, 1.08, 0.95],
  medium: [0.81, 1.05, 1.29, 0.97, 0, 1.21, 0.97, 1.46, 0, 0.97, 1.29, 1.05],
  hard: [0.69, 1.04, 1.52, 0, 1.11, 1.66, 0, 1.11, 1.52, 0, 1.66, 1.04],
  expert: [0.52, 1.05, 0, 1.57, 1.31, 0, 1.83, 1.31, 0, 1.57, 1.05, 0],
  master: [0.31, 0, 1.26, 0, 1.89, 0, 2.53, 0, 1.89, 0, 1.26, 0],
};
export const diceFace = (f: number) => Math.floor(f * 6) + 1;

// ---------- Mines Duel ----------
export const DUEL_TILES = 25;
export const PVP_RAKE = 0.98;
