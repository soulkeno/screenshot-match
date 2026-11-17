import { useEffect, useState } from "react";
import { Sparkles, Trophy, ArrowRight, ShieldCheck, Percent, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { rankProgress, getRank, type Rank } from "@/lib/ranks";
import { wheelTierFor, vaultRate } from "@/lib/rewards";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function LevelUpDialog() {
  const { profile, userId } = useApp();
  const [levelUpData, setLevelUpData] = useState<{ oldRank: Rank; newRank: Rank } | null>(null);

  useEffect(() => {
    if (!profile || !userId) return;
    const prog = rankProgress(profile.total_wagered);
    const curRank = prog.cur;
    const storageKey = `keno:rank:${userId}`;
    const storedLevelStr = localStorage.getItem(storageKey);

    if (storedLevelStr === null) {
      // First time loading for this user: store current level and don't trigger
      localStorage.setItem(storageKey, String(curRank.level));
      return;
    }

    const storedLevel = parseInt(storedLevelStr, 10);
    if (curRank.level > storedLevel) {
      // Find the old rank
      const prevRank = getRank(prog.remaining ? profile.total_wagered - prog.remaining : 0);
      setLevelUpData({ oldRank: prevRank, newRank: curRank });
      localStorage.setItem(storageKey, String(curRank.level));
      try {
        sfx.win();
      } catch {}
    }
  }, [profile?.total_wagered, userId]);

  if (!levelUpData) return null;

  const { newRank } = levelUpData;
  const wheelTier = wheelTierFor(newRank.level);
  const interestRate = (vaultRate(newRank.level, !!profile?.is_vip) * 100).toFixed(2);

  return (
    <Dialog open={!!levelUpData} onOpenChange={(v) => !v && setLevelUpData(null)}>
      <DialogContent className="border-primary/40 bg-popover/95 backdrop-blur-2xl p-0 overflow-hidden sm:max-w-md shadow-2xl">
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
            <div className="relative size-44 sm:size-48 rounded-2xl overflow-hidden shadow-2xl border border-primary/30">
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
            Congratulations! Your wagers have unlocked the prestigious <strong>{newRank.name}</strong> rank and enhanced perks!
          </p>

          {/* Perks Unlocked Card */}
          <div className="mt-5 w-full space-y-2 rounded-xl border border-border/80 bg-surface/80 p-3.5 text-left text-xs shadow-inner">
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
              <span className="font-bold text-success">Up to {interestRate}% / day</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="size-3.5 text-primary" /> Rakeback Booster
              </span>
              <span className="font-bold text-primary">Active Multiplier</span>
            </div>
          </div>

          {/* Continue Button */}
          <Button
            size="lg"
            className="mt-6 w-full font-bold shadow-press bg-gradient-primary text-primary-foreground"
            onClick={() => setLevelUpData(null)}
          >
            Claim & Continue <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
