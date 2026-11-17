import { describe, expect, it } from "vitest";
import { WHEELS, wheelTierFor, pickSlice, pickQuests, questProgress, QUEST_POOL, nextStreak, streakBonus, vaultRate } from "@/lib/rewards";

describe("lucky wheel", () => {
  it("unlocks Bronze → Gold → Diamond by rank", () => {
    expect(wheelTierFor(0)).toBe("bronze");
    expect(wheelTierFor(2)).toBe("bronze");
    expect(wheelTierFor(3)).toBe("gold");
    expect(wheelTierFor(5)).toBe("gold");
    expect(wheelTierFor(6)).toBe("diamond");
    expect(wheelTierFor(7)).toBe("diamond");
  });
  it("every wheel has coins, rakeback boosters and a cosmetic slice", () => {
    for (const w of Object.values(WHEELS)) {
      const kinds = new Set(w.prizes.map((p) => p.kind));
      expect([...kinds].sort()).toEqual(["boost", "coins", "cosmetic"]);
    }
  });
  it("picks slices by weight", () => {
    const prizes = WHEELS.bronze.prizes;
    expect(pickSlice(prizes, 0)).toBe(0);
    expect(pickSlice(prizes, 0.9999)).toBe(prizes.length - 1);
  });
});

describe("daily quests", () => {
  it("gives 3 different quests per day", () => {
    const q = pickQuests([0.999, 0.999, 0.999]);
    expect(q).toHaveLength(3);
    expect(new Set(q).size).toBe(3);
  });
  it("tracks a Crash 5.00× hit", () => {
    const q = QUEST_POOL.find((x) => x.id === "crash-5x")!;
    expect(questProgress(q, [{ game: "crash", wager: 10, payout: 49, multiplier: 4.9 }])).toBe(0);
    expect(questProgress(q, [{ game: "crash", wager: 10, payout: 50, multiplier: 5 }])).toBe(1);
  });
  it("counts wagered coins up to 25,000", () => {
    const q = QUEST_POOL.find((x) => x.id === "wager-25k")!;
    expect(questProgress(q, [{ game: "dice", wager: 20000, payout: 0, multiplier: 0 }])).toBe(20000);
    expect(questProgress(q, [{ game: "dice", wager: 30000, payout: 0, multiplier: 0 }])).toBe(25000);
  });
  it("streak grows on consecutive days and resets after a gap", () => {
    expect(nextStreak(0, null, "2026-11-17")).toBe(1);
    expect(nextStreak(3, "2026-11-16", "2026-11-17")).toBe(4);
    expect(nextStreak(3, "2026-11-14", "2026-11-17")).toBe(1);
    expect(streakBonus(1)).toBe(5000);
    expect(streakBonus(20)).toBe(35000);
  });
});

describe("vault interest", () => {
  it("is between 1% and 2% per day", () => {
    expect(vaultRate(0, false)).toBeCloseTo(0.01);
    expect(vaultRate(7, false)).toBeCloseTo(0.01875);
    expect(vaultRate(7, true)).toBeCloseTo(0.02);
  });
});
