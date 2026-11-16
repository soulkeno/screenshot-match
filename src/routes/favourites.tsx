import { createFileRoute, Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { GAMES } from "@/lib/games/registry";
import { GameGrid } from "@/components/app/GameTile";
import { PageHeader } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/favourites")({
  head: () => ({ meta: [{ title: "Favourites — Keno Casino" }, { name: "description", content: "Your favourite games on Keno Casino." }, { property: "og:title", content: "Favourites — Keno Casino" }, { property: "og:description", content: "Your favourite games on Keno Casino." }] }),
  component: Page,
});

function Page() {
  const { favorites } = useApp();
  const games = GAMES.filter((g) => favorites.has(g.slug));
  return (
    <div className="animate-fade-up">
      <PageHeader icon={Star} title="Favourites" subtitle="Tap the star on any game to pin it here." />
      {games.length ? <GameGrid games={games} /> : (
        <div className="panel p-10 text-center"><p className="text-muted-foreground">No favourites yet.</p><Button asChild className="mt-4"><Link to="/">Browse games</Link></Button></div>
      )}
    </div>
  );
}
