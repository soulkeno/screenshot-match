import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Amount, PageHeader, UserAvatar, VipTag } from "@/components/common/bits";
import { BetsTable } from "@/components/app/LiveBets";
import { useApp } from "@/lib/app-context";
import { RANKS, rankProgress } from "@/lib/ranks";
import { fmtCompact, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Profile Stats — Keno Casino" }, { name: "description", content: "Your rank, wagered total, wins and bet history on Keno Casino." }, { property: "og:title", content: "Profile Stats — Keno Casino" }, { property: "og:description", content: "Your rank, wagered total, wins and bet history on Keno Casino." }] }),
  component: Page,
});

function Page() {
  const { profile, userId } = useApp();
  const [bets, setBets] = useState<Tables<"bets">[]>([]);
  useEffect(() => {
    if (!userId) return;
    void supabase.from("bets").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20).then(({ data }) => setBets(data ?? []));
  }, [userId]);
  if (!profile) return null;
  const prog = rankProgress(profile.total_wagered);
  const profit = Number(profile.total_payout) - Number(profile.total_wagered);
  const stats = [
    { l: "Total wagered", v: <Amount value={profile.total_wagered} compact /> },
    { l: "Profit", v: <Amount value={profit} compact signed className={profit >= 0 ? "text-success" : "text-destructive"} /> },
    { l: "Bets", v: fmtInt(profile.bets_count) },
    { l: "Wins", v: fmtInt(profile.wins_count) },
    { l: "Biggest win", v: <Amount value={profile.biggest_win} compact /> },
    { l: "Best multiplier", v: Number(profile.biggest_multiplier).toFixed(2) + "×" },
  ];
  return (
    <div className="animate-fade-up">
      <PageHeader icon={BarChart3} title="Profile Stats" />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="panel relative overflow-hidden p-6">
          <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(80% 120% at 0% 0%, ${prog.cur.tone}, transparent 70%)` }} />
          <div className="relative flex items-center gap-5">
            <UserAvatar name={profile.username} url={profile.avatar_url} size={72} className="rounded-2xl" />
            <div className="flex-1">
              <p className="flex items-center gap-2 text-2xl font-bold">{profile.username}{profile.is_vip && <VipTag />}</p>
              <p className="text-sm font-bold" style={{ color: prog.cur.tone }}>{prog.cur.name}</p>
            </div>
            <img src={prog.cur.icon} alt={prog.cur.name} className="size-24 animate-float" />
          </div>
          <div className="relative mt-6">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>{prog.cur.name}</span><span>{prog.next ? `${fmtCompact(prog.remaining)} more to ${prog.next.name}` : "Max rank"}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${prog.pct}%` }} /></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => <div key={s.l} className="panel p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.l}</p><div className="mt-1 text-lg font-bold tabular">{s.v}</div></div>)}
        </div>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">Ranks</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {RANKS.map((r) => (
          <div key={r.name} className={cn("panel flex flex-col items-center p-3 text-center", r.index > prog.cur.index && "opacity-45", r.index === prog.cur.index && "ring-2 ring-primary")}>
            <img src={r.icon} alt={r.name} className="size-14" />
            <p className="mt-1 text-sm font-bold" style={{ color: r.tone }}>{r.name}</p>
            <p className="text-[11px] text-muted-foreground">{fmtCompact(r.min)} wagered</p>
          </div>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">Recent bets</h2>
      <div className="panel overflow-hidden"><BetsTable bets={bets} showPlayer={false} /></div>
    </div>
  );
}
