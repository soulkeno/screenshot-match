import starter from "@/assets/ranks/starter.png.asset.json";
import novice from "@/assets/ranks/novice.png.asset.json";
import emerald from "@/assets/ranks/emerald.png.asset.json";
import unreal from "@/assets/ranks/unreal.png.asset.json";
import shine from "@/assets/ranks/shine.png.asset.json";
import god from "@/assets/ranks/god.png.asset.json";
import champion from "@/assets/ranks/champion.png.asset.json";
import grandmaster from "@/assets/ranks/grandmaster.png.asset.json";

export type Rank = { index: number; name: string; min: number; icon: string; tone: string };

// Thresholds are total wagered. Keep in sync with public.rank_index() in the database.
export const RANKS: Rank[] = [
  { index: 0, name: "Starter", min: 0, icon: starter.url, tone: "oklch(0.85 0.05 230)" },
  { index: 1, name: "Novice", min: 50_000, icon: novice.url, tone: "oklch(0.68 0.19 25)" },
  { index: 2, name: "Emerald", min: 250_000, icon: emerald.url, tone: "oklch(0.78 0.2 145)" },
  { index: 3, name: "Unreal", min: 1_000_000, icon: unreal.url, tone: "oklch(0.68 0.17 270)" },
  { index: 4, name: "Shine", min: 5_000_000, icon: shine.url, tone: "oklch(0.72 0.22 320)" },
  { index: 5, name: "God", min: 20_000_000, icon: god.url, tone: "oklch(0.76 0.13 245)" },
  { index: 6, name: "Champion", min: 75_000_000, icon: champion.url, tone: "oklch(0.72 0.2 35)" },
  { index: 7, name: "Grandmaster", min: 250_000_000, icon: grandmaster.url, tone: "oklch(0.8 0.2 130)" },
];

export const DAILY_REWARDS = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000];
export const RAKEBACK_RATE = { normal: 0.003, vip: 0.006 };

export function getRank(wagered: number | string | null | undefined): Rank {
  const w = Number(wagered ?? 0);
  let r = RANKS[0];
  for (const x of RANKS) if (w >= x.min) r = x;
  return r;
}
export function rankProgress(wagered: number | string | null | undefined) {
  const w = Number(wagered ?? 0);
  const cur = getRank(w);
  const next = RANKS[cur.index + 1] ?? null;
  const pct = next ? Math.min(100, ((w - cur.min) / (next.min - cur.min)) * 100) : 100;
  return { cur, next, pct, remaining: next ? next.min - w : 0 };
}
