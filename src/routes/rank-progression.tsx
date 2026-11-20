import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Trophy, CheckCircle2, ChevronRight, Gift, Disc3 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { RANKS, rankProgress } from "@/lib/ranks";
import { fmt, fmtCompact } from "@/lib/format";
import { Coin } from "@/components/common/bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rank-progression")({
  head: () => ({
    meta: [
      { title: "Rank Progression — Keno VIP Club" },
      { name: "description", content: "Climb through 8 VIP tiers to unlock higher Daily Coins, upgraded Lucky Wheels, and boosted Rakeback." },
    ],
  }),
  component: RankProgressionPage,
});

export function RankProgressionPage() {
  const { profile, setWheelOpen } = useApp();
  const prog = rankProgress(profile?.total_wagered);
  const curTier = prog.cur;
  const nextTier = prog.next;

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-up select-none pb-16">
      {/* 2. Hero Progression Card (Top Stage) */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-xl border border-white/10"
        style={{
          background: `radial-gradient(120% 120% at 50% 0%, ${curTier.tone}35 0%, #181c25 55%, #101218 100%)`,
          boxShadow: `0 20px 60px -15px ${curTier.tone}25, inset 0 1px 0 rgba(255,255,255,0.15)`,
        }}
      >
        {/* Ambient background badge glow */}
        <img
          src={curTier.icon}
          alt=""
          className="pointer-events-none absolute -right-6 -top-6 size-72 object-contain opacity-15 blur-sm"
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Big Glowing Current Rank Icon */}
          <div
            className="relative mb-4 rounded-3xl p-3 shadow-2xl transition-transform hover:scale-105"
            style={{
              background: `radial-gradient(circle, ${curTier.tone}50 0%, rgba(20,24,33,0.8) 100%)`,
              boxShadow: `0 0 35px ${curTier.tone}60, inset 0 1px 0 rgba(255,255,255,0.2)`,
            }}
          >
            <img
              src={curTier.icon}
              alt={curTier.name}
              className="size-24 md:size-28 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] animate-float"
            />
          </div>

          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
            <span style={{ color: curTier.tone }}>{curTier.name}</span> is your current tier
          </h1>
          <p className="mt-2 max-w-xl text-xs md:text-sm text-muted-foreground leading-relaxed">
            Your progress is an accumulated sum through your total wager. Level up through tiers to unlock upgraded Daily Wheels, higher Rakeback, and larger Daily Coins.
          </p>

          {/* Interactive Progress Bar */}
          <div className="mt-8 w-full max-w-2xl space-y-3 rounded-2xl border border-white/10 bg-black/40 p-5 shadow-inner">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-2">
                <img src={curTier.icon} alt="" className="size-6 object-contain" />
                <span style={{ color: curTier.tone }}>{curTier.name}</span>
              </span>
              <span className="flex items-center gap-2">
                {nextTier ? (
                  <>
                    <span className="text-muted-foreground">{nextTier.name}</span>
                    <img src={nextTier.icon} alt="" className="size-6 object-contain" />
                  </>
                ) : (
                  <span className="text-emerald-400">Max Rank Reached!</span>
                )}
              </span>
            </div>

            {/* Glowing Gradient Bar */}
            <div className="relative h-4 overflow-hidden rounded-full bg-black/70 border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-700 shadow-md"
                style={{
                  width: `${prog.pct}%`,
                  background: `linear-gradient(90deg, #10b981 0%, ${curTier.tone} 100%)`,
                  boxShadow: `0 0 16px ${curTier.tone}`,
                }}
              />
            </div>

            {/* Percentage Ticks */}
            <div className="flex justify-between px-1 text-[10px] font-bold text-muted-foreground/70">
              <span>10%</span>
              <span>30%</span>
              <span>50%</span>
              <span>70%</span>
              <span>90%</span>
            </div>

            {/* Progress Text */}
            <p className="pt-1 text-center font-mono text-xs font-bold text-white flex items-center justify-center gap-1.5">
              <Coin className="size-4" />
              <span>
                {fmt(prog.wagered, 0)} / {nextTier ? fmt(nextTier.min, 0) : fmt(curTier.min, 0)} Wagered
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-[#00d293]">
                {prog.pct.toFixed(1)}%
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setWheelOpen(true)}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00d293] to-emerald-400 hover:from-[#00d293]/95 hover:to-emerald-300 text-[#05261b] px-6 py-3 text-xs font-black shadow-[0_4px_20px_rgba(0,210,147,0.4)] transition hover:scale-105 cursor-pointer"
            >
              <Disc3 className="size-4 animate-spin text-[#05261b]" style={{ animationDuration: "6s" }} />
              <span>Spin {curTier.wheelTier} Wheel</span>
            </button>
            <Link
              to="/rewards"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white px-5 py-3 text-xs font-bold transition cursor-pointer"
            >
              <Gift className="size-4 text-amber-400" />
              <span>Claim Daily Coins</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Tier Perk Cards Grid (2-column grid of all 8 tiers) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <Trophy className="size-5 text-amber-400" />
            <span>VIP Tiers & Exclusive Perks</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every bet you make counts towards leveling up permanently. Perks never expire.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RANKS.map((tier) => {
            const isCurrent = curTier.index === tier.index;
            const isUnlocked = curTier.index >= tier.index;

            return (
              <div
                key={tier.name}
                className={cn(
                  "relative flex flex-col justify-between rounded-2xl border p-5 shadow-card transition-all duration-300 hover:-translate-y-1",
                  isCurrent
                    ? "border-[#00d293]/60 bg-gradient-to-br from-[#1a2522] via-[#141822] to-[#101218] shadow-[0_10px_30px_rgba(0,210,147,0.15)] ring-1 ring-[#00d293]/40"
                    : isUnlocked
                    ? "border-white/10 bg-gradient-to-br from-[#181c25] to-[#121318]"
                    : "border-white/5 bg-[#141822]/70 opacity-80"
                )}
              >
                {/* Top Row: Rank Icon + Name + Current Tier Tag */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="relative rounded-2xl p-2 shrink-0 shadow-lg"
                      style={{
                        background: `radial-gradient(circle, ${tier.tone}40 0%, #161a24 100%)`,
                        boxShadow: `0 0 15px ${tier.tone}30`,
                      }}
                    >
                      <img src={tier.icon} alt={tier.name} className="size-12 object-contain" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-white tracking-wide" style={{ color: tier.tone }}>
                        {tier.name}
                      </h3>
                      <p className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Coin className="size-3.5" />
                        <span>{tier.min === 0 ? "Free on Signup" : `${fmt(tier.min, 0)} Coins Wagered`}</span>
                      </p>
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="flex items-center gap-1.5 rounded-full bg-[#00d293] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#05261b] shadow-md shadow-[#00d293]/30">
                      <span className="size-1.5 rounded-full bg-[#05261b] animate-pulse" />
                      Your Tier
                    </span>
                  )}
                </div>

                {/* Bullet Perks */}
                <ul className="mt-4 space-y-2 border-t border-white/5 pt-3 text-xs text-white/90">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-[#00d293] shrink-0" />
                    <span>Daily Coins: <strong className="text-white font-mono">{fmt(tier.dailyReward, 0)}</strong> free every 24h</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-[#00d293] shrink-0" />
                    <span>Lucky Wheel: Unlocks <strong className="text-amber-400">{tier.wheelTier} Wheel</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-[#00d293] shrink-0" />
                    <span>Rakeback & Vault: <strong className="text-[#00d293]">{tier.rakebackBoost}</strong> rakeback, <strong className="text-[#00d293]">{tier.vaultBoost}</strong> vault interest</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-[#00d293] shrink-0" />
                    <span>Exclusive chat rank badge & customizable name cosmetics</span>
                  </li>
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
