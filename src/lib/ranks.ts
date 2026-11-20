export type Rank = {
  index: number;
  name: string;
  min: number;
  icon: string;
  tone: string;
  bgGradient: string;
  wheelTier: "Bronze" | "Gold" | "Diamond";
  dailyReward: number;
  rakebackBoost: string;
  vaultBoost: string;
};

// Thresholds are total wagered coins.
export const RANKS: Rank[] = [
  {
    index: 0,
    name: "Bronze",
    min: 0,
    icon: "/ranks/bronze.png",
    tone: "#d97706",
    bgGradient: "from-amber-900/30 via-[#181c25] to-[#121318]",
    wheelTier: "Bronze",
    dailyReward: 1_000,
    rakebackBoost: "1.0×",
    vaultBoost: "+0.2%",
  },
  {
    index: 1,
    name: "Silver",
    min: 50_000,
    icon: "/ranks/silver.png",
    tone: "#94a3b8",
    bgGradient: "from-slate-700/30 via-[#181c25] to-[#121318]",
    wheelTier: "Bronze",
    dailyReward: 2_500,
    rakebackBoost: "1.2×",
    vaultBoost: "+0.4%",
  },
  {
    index: 2,
    name: "Gold",
    min: 250_000,
    icon: "/ranks/gold.png",
    tone: "#f59e0b",
    bgGradient: "from-amber-600/30 via-[#181c25] to-[#121318]",
    wheelTier: "Gold",
    dailyReward: 5_000,
    rakebackBoost: "1.5×",
    vaultBoost: "+0.6%",
  },
  {
    index: 3,
    name: "Platinum",
    min: 1_000_000,
    icon: "/ranks/platinum.png",
    tone: "#38bdf8",
    bgGradient: "from-sky-700/30 via-[#181c25] to-[#121318]",
    wheelTier: "Gold",
    dailyReward: 10_000,
    rakebackBoost: "1.8×",
    vaultBoost: "+0.8%",
  },
  {
    index: 4,
    name: "Diamond",
    min: 5_000_000,
    icon: "/ranks/dimond.png",
    tone: "#818cf8",
    bgGradient: "from-indigo-700/30 via-[#181c25] to-[#121318]",
    wheelTier: "Diamond",
    dailyReward: 25_000,
    rakebackBoost: "2.2×",
    vaultBoost: "+1.0%",
  },
  {
    index: 5,
    name: "Gem",
    min: 20_000_000,
    icon: "/ranks/gem.png",
    tone: "#ec4899",
    bgGradient: "from-pink-700/30 via-[#181c25] to-[#121318]",
    wheelTier: "Diamond",
    dailyReward: 50_000,
    rakebackBoost: "2.6×",
    vaultBoost: "+1.2%",
  },
  {
    index: 6,
    name: "Master",
    min: 75_000_000,
    icon: "/ranks/master.png",
    tone: "#ef4444",
    bgGradient: "from-rose-800/35 via-[#181c25] to-[#121318]",
    wheelTier: "Diamond",
    dailyReward: 100_000,
    rakebackBoost: "3.0×",
    vaultBoost: "+1.5%",
  },
  {
    index: 7,
    name: "Great Wealth",
    min: 250_000_000,
    icon: "/ranks/great_wealth.png",
    tone: "#eab308",
    bgGradient: "from-yellow-600/35 via-[#181c25] to-[#121318]",
    wheelTier: "Diamond",
    dailyReward: 250_000,
    rakebackBoost: "4.0×",
    vaultBoost: "+2.0%",
  },
];

export const DAILY_REWARDS = RANKS.map((r) => r.dailyReward);
export const RAKEBACK_RATE = { normal: 0.003, vip: 0.006 };

export function getRank(wagered: number | string | null | undefined): Rank {
  const w = Number(wagered ?? 0);
  let r = RANKS[0];
  for (const x of RANKS) {
    if (w >= x.min) r = x;
  }
  return r;
}

export function rankProgress(wagered: number | string | null | undefined) {
  const w = Number(wagered ?? 0);
  const cur = getRank(w);
  const next = RANKS[cur.index + 1] ?? null;
  const pct = next ? Math.min(100, Math.max(0, ((w - cur.min) / (next.min - cur.min)) * 100)) : 100;
  return { cur, next, pct, remaining: next ? Math.max(0, next.min - w) : 0, wagered: w };
}
