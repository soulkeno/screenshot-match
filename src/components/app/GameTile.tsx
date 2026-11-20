import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Star, Play, Info } from "lucide-react";
import type { GameMeta } from "@/lib/games/registry";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

const GAME_COVERS: Record<string, string> = {
  roulette: "/games/roulette.jpg",
  mines: "/games/mines.jpg",
  blackjack: "/games/blackjack.jpg",
  upgrader: "/games/upgrader.jpg",
  limbo: "/games/limbo.jpg",
  towers: "/games/towers.jpg",
  cases: "/games/cases.jpg",
  "case-battles": "/games/case-battles.jpg",
  crash: "/games/crash.jpg",
  dice: "/games/dice.jpg",
  coinflip: "/games/coinflip.jpg",
  plinko: "/games/plinko.jpg",
  snakes: "/games/snakes.jpg",
  rps: "/games/rps.jpg",
  "mines-duel": "/games/mines-duel.jpg",
  keno: "/games/keno.jpg",
  hilo: "/games/hilo.jpg",
  "pvp-coinflip": "/games/pvp-coinflip.jpg",
  slots: "https://bgaming.com/wp-content/uploads/2025/07/tg_image_3398176289-1-1-420x228.webp",
  chess: "/games/blackjack.jpg",
};

function getBadge(g: GameMeta): { text: string; bg: string } | null {
  if (g.slug === "crash" || g.slug === "mines" || g.slug === "slots") {
    return { text: "HOT", bg: "bg-rose-500 text-white" };
  }
  if (g.slug === "chess" || g.slug === "case-battles") {
    return { text: "NEW", bg: "bg-[#00d293] text-[#05261b]" };
  }
  if (g.category === "pvp") {
    return { text: "PVP", bg: "bg-indigo-500 text-white" };
  }
  return null;
}

export function GameTile({ g }: { g: GameMeta }) {
  const { favorites, toggleFavorite } = useApp();
  const navigate = useNavigate();
  const fav = favorites.has(g.slug);
  const cover = GAME_COVERS[g.slug];
  const badge = getBadge(g);

  return (
    <div className="group relative select-none">
      <div
        className={cn(
          "relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-[#1a1d24] shadow-card transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-[#00d293]/40 group-hover:shadow-[0_12px_30px_rgba(0,210,147,0.15)]",
          !cover && g.tone
        )}
      >
        {/* Cover Artwork */}
        {cover ? (
          <>
            <img
              src={cover}
              alt={g.name}
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121318]/95 via-[#121318]/30 to-black/30" />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-4">
            <g.icon className="size-16 text-white/90 drop-shadow-lg transition-transform duration-300 group-hover:scale-110" />
          </div>
        )}

        {/* Top Badges & Favorite */}
        <div className="relative z-10 flex items-center justify-between p-2.5">
          {badge ? (
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md", badge.bg)}>
              {badge.text}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full">
              {g.category === "pvp" ? "PvP" : g.category === "slots" ? "Slots" : "Original"}
            </span>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void toggleFavorite(g.slug);
            }}
            aria-label="Favourite"
            className={cn(
              "grid size-7 place-items-center rounded-full bg-black/50 text-white/80 backdrop-blur transition-all hover:scale-110 hover:text-amber-400",
              fav && "text-amber-400 fill-current opacity-100"
            )}
          >
            <Star className={cn("size-3.5", fav && "fill-current")} />
          </button>
        </div>

        {/* Bottom Title Bar (Visible by default) */}
        <div className="relative z-10 p-3 pt-0 transition-opacity duration-200 group-hover:opacity-0">
          <p className="font-bold text-sm sm:text-base text-white tracking-wide truncate drop-shadow-md">
            {g.name}
          </p>
          <p className="text-[10px] text-white/60 truncate font-medium">
            {g.blurb}
          </p>
        </div>

        {/* Hover State: Dark gradient overlay revealing primary teal "▶ Play" and secondary "Demo" button */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-black/75 p-3 opacity-0 backdrop-blur-xs transition-all duration-300 group-hover:opacity-100">
          <p className="font-bold text-sm text-white tracking-wide text-center px-2 line-clamp-1">
            {g.name}
          </p>

          <Link
            to="/play/$slug"
            params={{ slug: g.slug }}
            className="flex items-center gap-1.5 rounded-full bg-[#00d293] hover:bg-[#00d293]/90 text-[#05261b] px-5 py-2 text-xs font-black shadow-lg transition-transform hover:scale-105 cursor-pointer w-full justify-center max-w-[130px]"
          >
            <Play className="size-3.5 fill-current" />
            <span>Play</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate({ to: "/play/$slug", params: { slug: g.slug } })}
            className="flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold px-4 py-1.5 transition-colors cursor-pointer w-full justify-center max-w-[130px]"
          >
            <Info className="size-3" />
            <span>Demo / Info</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function GameGrid({ games }: { games: GameMeta[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {games.map((g) => (
        <GameTile key={g.slug} g={g} />
      ))}
    </div>
  );
}
