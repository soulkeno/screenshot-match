import { useEffect, useState } from "react";
import { Sparkles, Trophy, ArrowRight, ShieldCheck, Percent, Zap, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { rankProgress, getRank, RANKS, type Rank } from "@/lib/ranks";
import { wheelTierFor, vaultRate } from "@/lib/rewards";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function showLevelUpAnimation(rank?: Rank) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("keno:show_levelup", { detail: rank }));
  }
}

export function LevelUpDialog() {
  const { profile, userId } = useApp();
  const [levelUpData, setLevelUpData] = useState<{ oldRank: Rank; newRank: Rank } | null>(null);

  useEffect(() => {
    if (!profile || !userId) return;
    const prog = rankProgress(profile.total_wagered);
    const curRank = prog.cur;
    const storageKey = `keno:rank_idx:${userId}`;
    const storedStr = localStorage.getItem(storageKey);

    if (storedStr === null) {
      // First time loading: if user has any rank > Starter, showcase the level up
      if (curRank.index > 0) {
        const prev = RANKS[curRank.index - 1] ?? RANKS[0];
        setLevelUpData({ oldRank: prev, newRank: curRank });
        try {
          sfx.win();
        } catch {}
      }
      localStorage.setItem(storageKey, String(curRank.index));
      return;
    }

    const storedIdx = parseInt(storedStr, 10);
    if (curRank.index > storedIdx) {
      const prev = RANKS[storedIdx] ?? RANKS[0];
      setLevelUpData({ oldRank: prev, newRank: curRank });
      localStorage.setItem(storageKey, String(curRank.index));
      try {
        sfx.win();
      } catch {}
    }
  }, [profile?.total_wagered, userId]);

  // Listen to manual or event-driven triggers
  useEffect(() => {
    const onManual = (e: any) => {
      const cur = rankProgress(profile?.total_wagered).cur;
      const target: Rank = e.detail || cur;
      const prev = target.index > 0 ? RANKS[target.index - 1] : RANKS[0];
      setLevelUpData({ oldRank: prev, newRank: target });
      try {
        sfx.win();
      } catch {}
    };
    window.addEventListener("keno:show_levelup", onManual);
    return () => window.removeEventListener("keno:show_levelup", onManual);
  }, [profile?.total_wagered]);

  if (!levelUpData) return null;

  const { newRank, oldRank } = levelUpData;
  const wheelTier = wheelTierFor(newRank.index);
  const interestRate = (vaultRate(newRank.index, !!profile?.is_vip) * 100).toFixed(2);

  return (
    <Dialog open={!!levelUpData} onOpenChange={(v) => !v && setLevelUpData(null)}>
      <DialogContent className="border-primary/50 bg-popover/95 backdrop-blur-2xl p-0 overflow-hidden sm:max-w-md shadow-2xl">
        <DialogTitle className="sr-only">Level Up! You reached {newRank.name}</DialogTitle>

        {/* Radiant Backdrop */}
        <div className="relative flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          {/* Ambient Lighting Rays */}
          <div
            className="absolute -top-24 size-80 rounded-full blur-3xl opacity-30 animate-pulse pointer-events-none"
            style={{ background: newRank.tone || "var(--primary)" }}
          />

          {/* Winged Crest Artwork */}
          <div className="relative mt-2 mb-3">
            <div className="relative size-44 sm:size-48 rounded-2xl overflow-hidden shadow-2xl border border-primary/40 bg-background/50">
              <img
                src="/level-up-badge.jpg"
                alt="Level Up Winged Crest"
                className="size-full object-cover animate-float"
              />
            </div>
            {/* Sparkles icon */}
            <div className="absolute -top-2 -right-2 grid size-9 place-items-center rounded-full bg-gold text-primary-foreground shadow-lg animate-bounce">
              <Sparkles className="size-5 fill-current" />
            </div>
          </div>

          {/* Title */}
          <p className="text-xs font-black tracking-widest uppercase text-gold flex items-center justify-center gap-1.5">
            <Trophy className="size-3.5 fill-current" /> Rank Advanced
          </p>
          <h2
            className="text-3xl font-black uppercase tracking-tight mt-1 animate-pop-in"
            style={{ color: newRank.tone }}
          >
            {newRank.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Congratulations! You've unlocked the prestigious <strong>{newRank.name}</strong> rank and enhanced perks!
          </p>

          {/* Rank Transition Comparison */}
          <div className="mt-4 flex items-center justify-center gap-3 w-full max-w-xs py-2 px-3 rounded-xl border border-border bg-surface/70">
            <div className="flex items-center gap-1.5 min-w-0">
              <img src={oldRank.icon} alt={oldRank.name} className="size-6 shrink-0 opacity-60" />
              <span className="text-xs font-bold text-muted-foreground truncate">{oldRank.name}</span>
            </div>
            <ArrowRight className="size-4 text-primary shrink-0 animate-pulse" />
            <div className="flex items-center gap-1.5 min-w-0">
              <img src={newRank.icon} alt={newRank.name} className="size-6 shrink-0" />
              <span className="text-xs font-black truncate" style={{ color: newRank.tone }}>{newRank.name}</span>
            </div>
          </div>

          {/* Perks Unlocked Card */}
          <div className="mt-4 w-full space-y-2 rounded-xl border border-border/80 bg-surface/80 p-3.5 text-left text-xs shadow-inner">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Perks Unlocked</p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Zap className="size-3.5 text-accent" /> Lucky Wheel
              </span>
              <span className="font-bold text-accent capitalize">{wheelTier} Wheel</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Percent className="size-3.5 text-success" /> Vault Daily Interest
              </span>
              <span className="font-bold text-success">+{interestRate}% / 24h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="size-3.5 text-primary" /> Daily Bonus Rewards
              </span>
              <span className="font-bold text-primary">Upgraded Claim</span>
            </div>
          </div>

          {/* Action Button */}
          <Button
            size="lg"
            className="mt-5 w-full font-black text-sm uppercase tracking-wider shadow-glow"
            onClick={() => setLevelUpData(null)}
          >
            Claim & Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
