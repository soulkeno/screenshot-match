import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useApp } from "@/lib/app-context";
import { GAME_BY_SLUG, gameName } from "@/lib/games/registry";
import { UserAvatar, UserName, Coin } from "@/components/common/bits";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

type Bet = Tables<"bets">;

export function BetsTable({ bets, showPlayer = true }: { bets: Bet[]; showPlayer?: boolean }) {
  const { openProfile } = useApp();
  if (bets.length === 0) return <p className="px-4 py-10 text-center text-sm text-muted-foreground">No bets yet — be the first to play.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
            <th className="px-5 py-3">Game</th>
            {showPlayer && <th className="px-5 py-3">Player Name</th>}
            <th className="px-5 py-3 text-right">Bet Amount</th>
            <th className="px-5 py-3 text-right">Multiplier</th>
            <th className="px-5 py-3 text-right">Profit Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {bets.map((b) => {
            const g = GAME_BY_SLUG[b.game];
            const win = Number(b.payout) > Number(b.wager);
            return (
              <tr key={b.id} className="hover:bg-[#222630]/60 transition-colors animate-fade-up">
                {/* Game */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5 font-bold">
                    <span className={cn("grid size-7 place-items-center rounded-xl shadow-sm shrink-0", g ? g.tone : "bg-[#00d293]/20 text-[#00d293]")}>
                      {g ? <g.icon className="size-3.5" /> : <Sparkles className="size-3.5" />}
                    </span>
                    <span className="text-white font-semibold">{gameName(b.game)}</span>
                  </div>
                </td>
                {showPlayer && (
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => openProfile(b.user_id)}
                      className="flex items-center gap-2 font-medium hover:text-[#00d293] transition-colors"
                    >
                      <UserAvatar name={b.username} size={24} className="rounded-full ring-1 ring-white/10" />
                      <UserName userId={b.user_id} name={b.username} className="text-white/90 font-medium" />
                    </button>
                  </td>
                )}

                {/* Bet Amount */}
                <td className="px-5 py-3.5 text-right font-mono font-bold text-white">
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
                    <span className="inline-flex items-center gap-1 text-[#00d293] bg-[#00d293]/10 border border-[#00d293]/25 px-2.5 py-0.5 rounded-full text-xs">
                      +{fmt(netProfit)} <ArrowUpRight className="size-3 text-[#00d293]" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-400/90 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-xs">
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
  const [tab, setTab] = useState<"all" | "mine" | "big">("all");
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    let q = supabase.from("bets").select("*").order("created_at", { ascending: false }).limit(15);
    if (tab === "mine" && userId) q = q.eq("user_id", userId);
    if (tab === "big") q = q.gte("multiplier", 5);
    void q.then(({ data }) => setBets(data ?? []));
    const ch = supabase.channel(`bets-${tab}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bets" }, (pl) => {
        const b = pl.new as Bet;
        if (tab === "mine" && b.user_id !== userId) return;
        if (tab === "big" && Number(b.multiplier) < 5) return;
        setBets((prev) => [b, ...prev].slice(0, 15));
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [tab, userId]);

  return (
    <section className="mt-8 space-y-3">
      {/* Header with Sub-tabs and Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
          <Activity className="size-5 text-[#00d293]" />
          <span>Latest Bets & Race</span>
        </h2>

        <div className="flex items-center gap-2">
          {/* Subtabs matching BelaBet pill style */}
          <div className="flex rounded-full bg-[#1a1d24] p-1 border border-white/5 text-[11px] font-bold">
            <button
              onClick={() => setTab("all")}
              className={cn("px-3.5 py-1.5 rounded-full transition-all", tab === "all" ? "bg-[#00d293] text-[#05261b] shadow-sm font-black" : "text-muted-foreground hover:text-white")}
            >
              Latest Bets
            </button>
            <button
              onClick={() => setTab("high")}
              className={cn("px-3.5 py-1.5 rounded-full transition-all", tab === "high" ? "bg-[#00d293] text-[#05261b] shadow-sm font-black" : "text-muted-foreground hover:text-white")}
            >
              High Rollers
            </button>
            <button
              onClick={() => setTab("race")}
              className={cn("px-3.5 py-1.5 rounded-full transition-all", tab === "race" ? "bg-[#00d293] text-[#05261b] shadow-sm font-black" : "text-muted-foreground hover:text-white")}
            >
              Wager Contest
            </button>
          </div>

          <button className="flex items-center gap-1.5 rounded-full border border-white/5 bg-[#1a1d24] px-3.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-white hover:bg-[#222630] transition-all">
            <Filter className="size-3 text-[#00d293]" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden border border-white/5 bg-[#1a1d24] backdrop-blur-md rounded-2xl shadow-xl">
        <BetsTable bets={bets} />
      </div>
    </section>
  );
}
