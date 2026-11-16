import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GAME_BY_SLUG } from "@/lib/games/registry";
import { GameGrid } from "@/components/app/GameTile";
import { BetsTable } from "@/components/app/LiveBets";
import { PageHeader, SectionTitle } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/recent")({
  head: () => ({ meta: [{ title: "Recently Played — Keno Casino" }, { name: "description", content: "Games you played recently on Keno Casino." }, { property: "og:title", content: "Recently Played — Keno Casino" }, { property: "og:description", content: "Games you played recently on Keno Casino." }] }),
  component: Page,
});

function Page() {
  const { userId } = useApp();
  const [bets, setBets] = useState<Tables<"bets">[] | null>(null);
  useEffect(() => {
    if (!userId) return;
    void supabase.from("bets").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100).then(({ data }) => setBets(data ?? []));
  }, [userId]);
  const slugs = [...new Set((bets ?? []).map((b) => b.game))].filter((s) => GAME_BY_SLUG[s]);
  return (
    <div className="animate-fade-up">
      <PageHeader icon={History} title="Recently Played" subtitle="Jump back into your latest games." />
      {bets && slugs.length === 0 && <div className="panel p-10 text-center"><p className="text-muted-foreground">You haven't played anything yet.</p><Button asChild className="mt-4"><Link to="/">Start playing</Link></Button></div>}
      {slugs.length > 0 && <GameGrid games={slugs.map((s) => GAME_BY_SLUG[s])} />}
      {bets && bets.length > 0 && <section className="mt-8"><SectionTitle icon={History}>Your last bets</SectionTitle><div className="panel overflow-hidden"><BetsTable bets={bets.slice(0, 25)} showPlayer={false} /></div></section>}
    </div>
  );
}
