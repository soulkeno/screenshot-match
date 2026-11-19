import { useEffect, useState } from "react";
import { Activity, Filter, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useApp } from "@/lib/app-context";
import { GAME_BY_SLUG, gameName } from "@/lib/games/registry";
import { UserAvatar, UserName, Coin } from "@/components/common/bits";
import { fmt, fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type Bet = Tables<"bets">;

export function BetsTable({ bets, showPlayer = true }: { bets: Bet[]; showPlayer?: boolean }) {
  const { openProfile } = useApp();
  if (bets.length === 0) {
    return <p className="px-4 py-12 text-center text-sm text-muted-foreground">No bets recorded yet — play a game to kick off the race!</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/60 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
            <th className="px-5 py-3">Game</th>
            {showPlayer && <th className="px-5 py-3">Player Name</th>}
            <th className="px-5 py-3 text-right">Bet Amount</th>
            <th className="px-5 py-3 text-right">Multiplier</th>
            <th className="px-5 py-3 text-right">Profit Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {bets.map((b) => {
            const g = GAME_BY_SLUG[b.game];
            const netProfit = Number(b.payout) - Number(b.wager);
            const win = netProfit > 0;
            const mult = Number(b.multiplier);

            return (
              <tr key={b.id} className="hover:bg-surface-2/40 transition-colors animate-fade-up">
                {/* Game */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5 font-bold">
                    <span className={cn("grid size-7 place-items-center rounded-lg shadow-sm shrink-0", g ? g.tone : "bg-primary/20 text-primary")}>
                      {g ? <g.icon className="size-4" /> : <Sparkles className="size-4" />}
                    </span>
                    <span className="text-foreground font-semibold">{gameName(b.game)}</span>
                  </div>
                </td>

                {/* Player */}
                {showPlayer && (
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => openProfile(b.user_id)}
                      className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
                    >
                      <UserAvatar name={b.username} size={26} className="rounded-full ring-1 ring-border" />
                      <UserName userId={b.user_id} name={b.username} className="text-foreground/90 font-medium" />
                    </button>
                  </td>
                )}

                {/* Bet Amount */}
                <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground">
                  <span className="inline-flex items-center gap-1.5 justify-end">
                    <Coin className="size-3.5" />
                    {fmt(b.wager)}
                  </span>
                </td>

                {/* Multiplier */}
                <td className="px-5 py-3.5 text-right font-mono text-muted-foreground font-semibold">
                  {mult.toFixed(2)}×
                </td>

                {/* Profit Amount Pill */}
                <td className="px-5 py-3.5 text-right font-mono font-bold">
                  {win ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      +{fmt(netProfit)} <ArrowUpRight className="size-3 text-emerald-400" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-400/90 bg-rose-500/5 px-2 py-0.5 rounded-md">
                      -{fmt(b.wager)} <ArrowDownRight className="size-3 text-rose-400/70" />
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LiveBets() {
  const { userId } = useApp();
  const [tab, setTab] = useState<"all" | "high" | "race">("all");
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    let q = supabase.from("bets").select("*").order("created_at", { ascending: false }).limit(15);
    if (tab === "high") q = q.gte("multiplier", 5);
    if (tab === "race") q = q.gte("wager", 1000);
    void q.then(({ data }) => setBets(data ?? []));

    const ch = supabase.channel(`bets-${tab}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bets" }, (pl) => {
        const b = pl.new as Bet;
        if (tab === "high" && Number(b.multiplier) < 5) return;
        if (tab === "race" && Number(b.wager) < 1000) return;
        setBets((prev) => [b, ...prev].slice(0, 15));
      })
      .subscribe();

    return () => { void supabase.removeChannel(ch); };
  }, [tab, userId]);

  return (
    <section className="mt-10 space-y-3">
      {/* Header with Sub-tabs and Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
          Latest bet & Race
        </h2>

        <div className="flex items-center gap-2">
          {/* Subtabs matching media_1795122310240_318d206c.jpg */}
          <div className="flex rounded-xl bg-surface-2/80 p-1 border border-border/50 text-[11px] font-bold">
            <button
              onClick={() => setTab("all")}
              className={cn("px-3 py-1.5 rounded-lg transition-all", tab === "all" ? "bg-surface text-foreground shadow-sm font-black" : "text-muted-foreground hover:text-foreground")}
            >
              LATEST BETS
            </button>
            <button
              onClick={() => setTab("high")}
              className={cn("px-3 py-1.5 rounded-lg transition-all", tab === "high" ? "bg-surface text-foreground shadow-sm font-black" : "text-muted-foreground hover:text-foreground")}
            >
              HIGH ROLLERS
            </button>
            <button
              onClick={() => setTab("race")}
              className={cn("px-3 py-1.5 rounded-lg transition-all", tab === "race" ? "bg-surface text-foreground shadow-sm font-black" : "text-muted-foreground hover:text-foreground")}
            >
              WAGER CONTEST
            </button>
          </div>

          <button className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-all">
            <Filter className="size-3.5" />
            <span>FILTER</span>
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden border border-border/60 bg-surface/60 backdrop-blur-md rounded-2xl shadow-xl">
        <BetsTable bets={bets} />
      </div>
    </section>
  );
}
