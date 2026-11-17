import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gift, Loader2, Sparkles, Check, Trophy, Clock, Flame, ChevronRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Amount, Coin, PageHeader, SnowCap } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { DAILY_REWARDS, RANKS, getRank } from "@/lib/ranks";
import { getQuestsFn, claimQuestFn } from "@/lib/games.functions";
import { WheelDialog } from "@/components/app/WheelDialog";
import { errMsg, fmt, timeLeft } from "@/lib/format";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Daily Rewards & Challenges — Keno Casino" },
      { name: "description", content: "Claim daily coins, spin the Lucky Wheel, and complete daily quests for streak bonuses." },
      { property: "og:title", content: "Daily Rewards & Challenges — Keno Casino" },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const { profile, wallet, refresh, setBalance } = useApp();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);

  // Daily Quests State
  const getQuests = useServerFn(getQuestsFn);
  const claimQuest = useServerFn(claimQuestFn);
  const [questsState, setQuestsState] = useState<{
    day: string;
    quests: Array<{ id: string; label: string; reward: number; goal: number; progress: number; claimed: boolean }>;
    bonusClaimed: boolean;
    streak: number;
    nextBonus: number;
    nextStreak: number;
    resetsAt: number;
  } | null>(null);
  const [questsLoading, setQuestsLoading] = useState(false);
  const [claimingIdx, setClaimingIdx] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const rank = getRank(profile?.total_wagered);
  const vip = !!profile?.is_vip;
  const dailyAmount = DAILY_REWARDS[rank.index] * (vip ? 2 : 1);
  const readyAt = wallet?.last_daily_at ? new Date(wallet.last_daily_at).getTime() + 86_400_000 : 0;
  const left = readyAt - now;

  async function claimDaily() {
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_daily");
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    sfx.win();
    toast.success(`+${fmt(data)} coins claimed! 🎉`);
    void refresh();
  }

  // Load Daily Quests
  useEffect(() => {
    let cancel = false;
    async function loadQuests() {
      setQuestsLoading(true);
      try {
        const res = await getQuests();
        if (!cancel && res) setQuestsState(res);
      } catch {
        // Safe catch
      } finally {
        if (!cancel) setQuestsLoading(false);
      }
    }
    void loadQuests();
    return () => {
      cancel = true;
    };
  }, []);

  async function handleClaimQuest(idx: number) {
    setClaimingIdx(idx);
    try {
      const res = await claimQuest({ data: { idx } });
      if (typeof res?.balance === "number") {
        setBalance(res.balance);
      }
      if (res?.state) {
        setQuestsState(res.state);
      }
      sfx.win();
      toast.success(idx === 99 ? `Claimed Streak Bonus of +${fmt(res.amount)} coins! 🔥` : `Claimed +${fmt(res.amount)} coins! 🎉`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setClaimingIdx(null);
    }
  }

  const allQuestsDone = questsState?.quests?.every((q) => q.claimed) ?? false;

  return (
    <div className="animate-fade-up space-y-8">
      <PageHeader
        icon={Gift}
        title="Rewards & Challenges"
        subtitle="Claim free coins every 24 hours, spin the Lucky Wheel, and complete daily quests for massive bonuses."
      />

      {/* Hero Grid: Daily Bonus & Lucky Wheel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Daily 24h Coin Drop */}
        <div className="panel relative overflow-hidden p-6 flex flex-col justify-between border border-border shadow-card rounded-2xl bg-gradient-to-b from-primary/10 via-surface to-background">
          <SnowCap />
          <div className="text-center sm:text-left flex items-start gap-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-primary/20 text-primary border border-primary/30 shrink-0">
              <Gift className="size-7 animate-float" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                24H Daily Bonus as {rank.name} {vip && "· VIP 2×"}
              </p>
              <Amount value={dailyAmount} className="text-3xl font-black mt-0.5 text-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Available once every 24 hours. Higher ranks earn more.</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border/60">
            <Button
              variant="play"
              size="lg"
              className="w-full font-bold shadow-press"
              disabled={busy || left > 0}
              onClick={claimDaily}
            >
              {busy ? <Loader2 className="animate-spin" /> : left > 0 ? `Ready in ${timeLeft(left)}` : "Claim Daily Bonus"}
            </Button>
          </div>
        </div>

        {/* 2. Daily Lucky Wheel Banner */}
        <div className="panel relative overflow-hidden p-6 flex flex-col justify-between border border-gold/40 shadow-card rounded-2xl bg-gradient-to-b from-gold/15 via-surface to-background">
          <SnowCap />
          <div className="text-center sm:text-left flex items-start gap-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-gold/20 text-gold border border-gold/40 shrink-0">
              <Sparkles className="size-7 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold">Daily Lucky Wheel</p>
              <p className="text-3xl font-black mt-0.5 text-foreground">Spin & Win</p>
              <p className="text-xs text-muted-foreground mt-1">
                Spin the 3D Lucky Wheel for free Coins, Rakeback Boosters, and rare Cosmetics!
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border/60">
            <Button
              size="lg"
              onClick={() => setWheelOpen(true)}
              className="w-full font-black text-sm uppercase tracking-wider bg-gradient-gold text-primary-foreground shadow-press hover:brightness-110"
            >
              <Sparkles className="size-4 mr-2" /> Open Lucky Wheel
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Daily Challenges & Quests System */}
      <div className="panel relative overflow-hidden p-6 border border-border shadow-card rounded-2xl bg-surface space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <h2 className="text-xl font-black tracking-wide">Daily Challenges & Quests</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete today's 3 objectives to earn coins and build your consecutive day streak bonus!
            </p>
          </div>

          {questsState && (
            <div className="flex items-center gap-2 self-start rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <Flame className="size-4 text-orange-500 animate-pulse" />
              <span>Streak: {questsState.streak} Day{questsState.streak === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>

        {questsLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground animate-pulse">Loading daily quests...</div>
        ) : !questsState ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Quests will update on your next bet!</div>
        ) : (
          <div className="space-y-4">
            {/* 3 Quest Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {questsState.quests.map((q, idx) => {
                const pct = Math.min(100, Math.round((q.progress / Math.max(1, q.goal)) * 100));
                const isReady = q.progress >= q.goal && !q.claimed;
                const isClaiming = claimingIdx === idx;

                return (
                  <div
                    key={q.id}
                    className={cn(
                      "rounded-xl border p-4 flex flex-col justify-between transition-all shadow-sm",
                      q.claimed
                        ? "border-success/30 bg-success/5 opacity-80"
                        : isReady
                          ? "border-primary/60 bg-primary/10 shadow-glow"
                          : "border-border bg-surface-2/60"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs font-bold">
                        <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Objective #{idx + 1}</span>
                        <span className="text-success flex items-center gap-1">
                          <Coin className="size-3.5 inline" /> +{fmt(q.reward)}
                        </span>
                      </div>
                      <p className="font-bold text-sm text-foreground mt-2 leading-snug">{q.label}</p>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>Progress</span>
                        <span>
                          {fmt(q.progress)} / {fmt(q.goal)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-background border border-border/40">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", q.claimed ? "bg-success" : "bg-gradient-primary")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <Button
                        size="sm"
                        variant={q.claimed ? "outline" : isReady ? "default" : "secondary"}
                        disabled={!isReady || isClaiming}
                        onClick={() => handleClaimQuest(idx)}
                        className="w-full mt-2 font-bold text-xs"
                      >
                        {isClaiming ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : q.claimed ? (
                          <>
                            <Check className="size-3.5 mr-1 text-success" /> Claimed
                          </>
                        ) : isReady ? (
                          "Claim Reward"
                        ) : (
                          "In Progress"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Streak Bonus Chest */}
            <div
              className={cn(
                "rounded-2xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-card",
                questsState.bonusClaimed
                  ? "border-success/40 bg-success/10"
                  : allQuestsDone
                    ? "border-gold/60 bg-gradient-to-r from-gold/20 via-surface-2 to-gold/10 ring-2 ring-gold/40 animate-pulse"
                    : "border-border bg-surface-2/40"
              )}
            >
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="grid size-14 place-items-center rounded-2xl bg-gold/20 text-gold border border-gold/40 shrink-0">
                  <Flame className="size-8 text-orange-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <p className="text-base font-black uppercase tracking-wide text-foreground">Streak Completion Chest</p>
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-black text-gold">
                      +{fmt(questsState.nextBonus)} Coins
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Finish all 3 daily quests today to collect your Day {questsState.nextStreak} streak chest!
                  </p>
                </div>
              </div>

              <Button
                variant={questsState.bonusClaimed ? "outline" : allQuestsDone ? "play" : "secondary"}
                disabled={!allQuestsDone || questsState.bonusClaimed || claimingIdx === 99}
                onClick={() => handleClaimQuest(99)}
                className="w-full sm:w-auto font-black px-6 shadow-press"
              >
                {claimingIdx === 99 ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : questsState.bonusClaimed ? (
                  <>
                    <Check className="size-4 mr-1 text-success" /> Streak Claimed Today
                  </>
                ) : allQuestsDone ? (
                  "Claim Streak Chest 🎉"
                ) : (
                  "Complete 3/3 to Unlock"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Rank Rewards Breakdown */}
      <div>
        <h3 className="text-base font-bold mb-3 flex items-center gap-2">
          <Trophy className="size-4 text-primary" /> Daily Bonus by Rank
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {RANKS.map((r) => (
            <div
              key={r.name}
              className={cn(
                "panel flex flex-col items-center p-3 text-center transition-all rounded-xl border border-border bg-surface",
                r.index === rank.index && "ring-2 ring-primary bg-primary/5"
              )}
            >
              <img src={r.icon} alt={r.name} className="size-12 animate-float" />
              <p className="mt-1 text-xs font-bold" style={{ color: r.tone }}>
                {r.name}
              </p>
              <Amount value={DAILY_REWARDS[r.index] * (vip ? 2 : 1)} compact className="text-xs mt-0.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Lucky Wheel Modal */}
      <WheelDialog open={wheelOpen} onOpenChange={setWheelOpen} />
    </div>
  );
}
