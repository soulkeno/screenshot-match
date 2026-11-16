import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Amount, PageHeader, RankTag, UserAvatar, VipTag } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — Keno Casino" }, { name: "description", content: "Top real players on Keno Casino by wagered, biggest win and multiplier." }, { property: "og:title", content: "Leaderboard — Keno Casino" }, { property: "og:description", content: "Top real players on Keno Casino by wagered, biggest win and multiplier." }] }),
  component: Page,
});

const TABS = [
  { k: "total_wagered", l: "Most wagered" },
  { k: "biggest_win", l: "Biggest win" },
  { k: "biggest_multiplier", l: "Biggest multiplier" },
] as const;

function Page() {
  const { openProfile, userId } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("total_wagered");
  const [rows, setRows] = useState<Tables<"profiles">[]>([]);
  useEffect(() => {
    void supabase.from("profiles").select("*").gt(tab, 0).order(tab, { ascending: false }).limit(50).then(({ data }) => setRows(data ?? []));
  }, [tab]);
  return (
    <div className="animate-fade-up">
      <PageHeader icon={Trophy} title="Leaderboard" subtitle="Real players only. Updated live." />
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        {TABS.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={cn("rounded-md px-3 py-1.5 text-xs font-bold", tab === t.k ? "bg-surface-2 text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:text-foreground")}>{t.l}</button>)}
      </div>
      <div className="panel overflow-hidden">
        {rows.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No one is on the board yet. Place a bet to claim #1.</p>}
        {rows.map((p, i) => (
          <button key={p.id} onClick={() => openProfile(p.id)} className={cn("flex w-full items-center gap-4 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-2", p.id === userId && "bg-primary/5")}>
            <span className={cn("w-8 text-center font-display text-2xl", i === 0 ? "text-gold" : i < 3 ? "text-primary" : "text-muted-foreground")}>{i + 1}</span>
            <UserAvatar name={p.username} url={p.avatar_url} size={36} />
            <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold"><span className="truncate">{p.username}</span>{p.is_vip && <VipTag />}<RankTag wagered={p.total_wagered} className="hidden sm:inline-flex" /></span>
            {tab === "biggest_multiplier" ? <span className="font-bold tabular text-success">{Number(p.biggest_multiplier).toFixed(2)}×</span> : <Amount value={p[tab]} compact />}
          </button>
        ))}
      </div>
    </div>
  );
}
