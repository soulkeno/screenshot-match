import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useApp } from "@/lib/app-context";
import { GAME_BY_SLUG, gameName } from "@/lib/games/registry";
import { Amount, RankIcon, SectionTitle } from "@/components/common/bits";
import { cn } from "@/lib/utils";

type Bet = Tables<"bets">;

export function BetsTable({ bets, showPlayer = true }: { bets: Bet[]; showPlayer?: boolean }) {
  const { openProfile } = useApp();
  if (bets.length === 0) return <p className="px-4 py-10 text-center text-sm text-muted-foreground">No bets yet — be the first to play.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Game</th>
            {showPlayer && <th className="px-4 py-3">Player</th>}
            <th className="hidden px-4 py-3 sm:table-cell">Time</th>
            <th className="px-4 py-3 text-right">Bet</th>
            <th className="px-4 py-3 text-right">Multiplier</th>
            <th className="px-4 py-3 text-right">Payout</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((b) => {
            const g = GAME_BY_SLUG[b.game];
            const win = Number(b.payout) > Number(b.wager);
            return (
              <tr key={b.id} className="border-t border-border/60 animate-fade-up odd:bg-surface/40">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2 font-semibold">
                    {g && <span className={cn("grid size-7 place-items-center rounded-md", g.tone)}><g.icon className="size-3.5" /></span>}
                    {gameName(b.game)}
                  </span>
                </td>
                {showPlayer && (
                  <td className="px-4 py-2.5">
                    <button onClick={() => openProfile(b.user_id)} className="flex items-center gap-1.5 font-medium hover:text-primary">
                      <RankIcon wagered={b.user_wagered} size={18} />{b.username}
                    </button>
                  </td>
                )}
                <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">{new Date(b.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-4 py-2.5 text-right"><Amount value={b.wager} compact className="justify-end" /></td>
                <td className={cn("px-4 py-2.5 text-right font-bold tabular", win ? "text-success" : "text-muted-foreground")}>{Number(b.multiplier).toFixed(2)}×</td>
                <td className={cn("px-4 py-2.5 text-right", win ? "text-success" : "text-muted-foreground")}><Amount value={win ? b.payout : -Number(b.wager)} compact signed className="justify-end" /></td>
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
    <section className="mt-8">
      <SectionTitle icon={Activity} right={
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {([["all", "All bets"], ["mine", "My bets"], ["big", "Big wins"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("rounded-md px-3 py-1.5 text-xs font-bold transition-colors", tab === k ? "bg-surface-2 text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
      }>Live Bets</SectionTitle>
      <div className="panel overflow-hidden"><BetsTable bets={bets} /></div>
    </section>
  );
}
