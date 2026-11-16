import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { GameMeta } from "@/lib/games/registry";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export function GameTile({ g }: { g: GameMeta }) {
  const { favorites, toggleFavorite } = useApp();
  const fav = favorites.has(g.slug);
  return (
    <div className="group relative">
      <Link to="/play/$slug" params={{ slug: g.slug }}
        className={cn("relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl border border-border p-3 shadow-card transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/50", g.tone)}>
        {/* Christmas snow cap */}
        <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none overflow-hidden rounded-t-xl">
          <div className="absolute inset-0 opacity-80" style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 60%, transparent 100%)',
            borderRadius: '4px 4px 50% 50%',
          }} />
          {/* small snow bumps */}
          <div className="absolute bottom-0 left-0 right-0 h-3 opacity-60" style={{
            background: 'radial-gradient(ellipse 20px 8px at 15% 100%, white 50%, transparent 51%), radial-gradient(ellipse 18px 7px at 40% 100%, white 50%, transparent 51%), radial-gradient(ellipse 22px 9px at 65% 100%, white 50%, transparent 51%), radial-gradient(ellipse 16px 7px at 85% 100%, white 50%, transparent 51%)',
          }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">{g.category === "pvp" ? "PvP" : g.category === "slots" ? "Slots" : "Ember Original"}</span>
        <g.icon className="mx-auto size-14 text-foreground drop-shadow-lg transition-transform duration-300 group-hover:scale-110" strokeWidth={1.6} />
        <div>
          <p className="font-display text-2xl leading-none tracking-wide text-foreground">{g.name}</p>
          <p className="mt-1 line-clamp-2 text-[11px] text-foreground/70">{g.blurb}</p>
        </div>
      </Link>
      <button onClick={() => void toggleFavorite(g.slug)} aria-label="Favourite"
        className={cn("absolute right-2 top-2 rounded-md bg-background/50 p-1.5 backdrop-blur transition-opacity", fav ? "text-gold opacity-100" : "text-foreground/80 opacity-0 group-hover:opacity-100")}>
        <Star className={cn("size-3.5", fav && "fill-current")} />
      </button>
    </div>
  );
}

export function GameGrid({ games }: { games: GameMeta[] }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">{games.map((g) => <GameTile key={g.slug} g={g} />)}</div>;
}
