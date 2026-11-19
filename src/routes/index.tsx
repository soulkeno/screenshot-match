import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Flame, Swords, Plane, ChevronLeft, ChevronRight, Sparkles, Rocket,
  Dice5, Disc3, Bomb, ArrowRight, ShieldCheck, Trophy
} from "lucide-react";
import { GAMES } from "@/lib/games/registry";
import { GameGrid } from "@/components/app/GameTile";
import { LiveBets } from "@/components/app/LiveBets";
import { SectionTitle } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Keno Casino — Provably Fair Crypto Casino" },
      { name: "description", content: "Play Mines, Crash, Blackjack, Chess Duels, Roulette and slots. Daily rewards and rakeback." },
      { property: "og:title", content: "Keno Casino" },
      { property: "og:description", content: "Play Mines, Crash, Blackjack, Chess Duels, Roulette and slots on Keno." },
    ],
  }),
  component: Home,
});

// Popular 3D game cards matching media_1795122310240_318d206c.jpg
const POPULAR_GAMES = [
  {
    slug: "crash",
    title: "CRASH",
    badge: "999×",
    badgeColor: "bg-amber-400 text-black",
    bgGradient: "from-[#521369] via-[#6e1e8b] to-[#3a094e]",
    border: "border-fuchsia-500/40",
    glow: "shadow-[0_8px_30px_rgba(217,70,239,0.25)]",
    icon: Rocket,
    iconColor: "text-amber-300",
  },
  {
    slug: "dice",
    title: "HASH DICE",
    badge: "777",
    badgeColor: "bg-emerald-400 text-black",
    bgGradient: "from-[#0d594b] via-[#127a67] to-[#083b31]",
    border: "border-emerald-400/40",
    glow: "shadow-[0_8px_30px_rgba(52,211,153,0.25)]",
    icon: Dice5,
    iconColor: "text-emerald-200",
  },
  {
    slug: "keno",
    title: "KENO",
    badge: "12",
    badgeColor: "bg-rose-500 text-white",
    bgGradient: "from-[#8a2a1b] via-[#ba3924] to-[#59160b]",
    border: "border-orange-500/40",
    glow: "shadow-[0_8px_30px_rgba(249,115,22,0.25)]",
    icon: Sparkles,
    iconColor: "text-amber-200",
  },
  {
    slug: "roulette",
    title: "ROULETTE",
    badge: "36×",
    badgeColor: "bg-cyan-400 text-black",
    bgGradient: "from-[#0c4e6e] via-[#106c99] to-[#073247]",
    border: "border-cyan-400/40",
    glow: "shadow-[0_8px_30px_rgba(56,189,248,0.25)]",
    icon: Disc3,
    iconColor: "text-cyan-200",
  },
  {
    slug: "mines",
    title: "MINES",
    badge: "GEMS",
    badgeColor: "bg-blue-400 text-black",
    bgGradient: "from-[#1d2d6b] via-[#283f99] to-[#111c47]",
    border: "border-blue-400/40",
    glow: "shadow-[0_8px_30px_rgba(96,165,250,0.25)]",
    icon: Bomb,
    iconColor: "text-amber-300",
  },
];

function Home() {
  const { profile } = useApp();
  const navigate = useNavigate();

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Hero Banner (Matching media_1795122310240_318d206c.jpg) */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-[#291b54] via-[#432d84] to-[#1c1240] p-6 md:p-10 shadow-2xl">
        {/* Floating Background Glow & Decorative Elements */}
        <div className="pointer-events-none absolute -right-16 -top-20 size-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 -bottom-20 size-80 rounded-full bg-purple-600/20 blur-3xl" />

        {/* 3D Roulette & Chips Illustration Overlay on Right */}
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center opacity-90 pr-6">
          <div className="relative size-64 lg:size-72 flex items-center justify-center">
            {/* Outer spinning wheel ring representation */}
            <div className="absolute inset-0 rounded-full border-8 border-purple-400/30 animate-[spin_40s_linear_infinite]" />
            <div className="absolute inset-4 rounded-full border-4 border-dashed border-amber-400/40 animate-[spin_25s_linear_infinite_reverse]" />
            <Disc3 className="size-48 text-purple-300 drop-shadow-[0_10px_25px_rgba(168,85,247,0.6)] animate-pulse" />
            <div className="absolute -top-2 -left-2 rounded-xl bg-gold/90 p-2 text-black font-black text-xs shadow-lg rotate-12">
              🪙 100K
            </div>
            <div className="absolute -bottom-2 -right-2 rounded-xl bg-cyan-400/90 p-2 text-black font-black text-xs shadow-lg -rotate-12">
              🎰 LUCKY
            </div>
          </div>
        </div>

        {/* Left Content */}
        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary border border-primary/40">
            <Sparkles className="size-3 text-gold" />
            <span>SIGN UP & GET REWARD</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.1]">
            UP TO 1,000,000 COINS
          </h1>

          <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed max-w-md">
            Dive into our wide range of in-house games, live casino and slots to experience true provably fair gaming.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <Link
              to="/rewards"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-purple-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105 hover:shadow-primary/50"
            >
              <span>GET STARTED</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              to="/clubs"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-white hover:bg-white/10 transition-colors"
            >
              <span>View Clubs</span>
            </Link>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5 pt-4">
            <span className="size-2 rounded-full bg-white" />
            <span className="size-1.5 rounded-full bg-white/40" />
            <span className="size-1.5 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* Popular Games (Matching media_1795122310240_318d206c.jpg) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            Popular Games
          </h2>
          <div className="flex items-center gap-1.5">
            <button className="grid size-8 place-items-center rounded-lg border border-border/60 bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all">
              <ChevronLeft className="size-4" />
            </button>
            <button className="grid size-8 place-items-center rounded-lg border border-border/60 bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {POPULAR_GAMES.map((card) => (
            <button
              key={card.slug}
              type="button"
              onClick={() => navigate({ to: "/play/$slug", params: { slug: card.slug } })}
              className={cn(
                "group relative aspect-[4/3] rounded-2xl border p-4 flex flex-col justify-between text-left overflow-hidden transition-all duration-300 hover:-translate-y-1.5 bg-gradient-to-br",
                card.bgGradient,
                card.border,
                card.glow
              )}
            >
              {/* Top Badge */}
              <div className="flex items-center justify-between">
                <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase shadow-sm", card.badgeColor)}>
                  {card.badge}
                </span>
              </div>

              {/* Center / Bottom 3D Icon Graphic */}
              <div className="absolute right-2 bottom-2 opacity-85 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <card.icon className={cn("size-16 sm:size-20", card.iconColor)} />
              </div>

              {/* Title */}
              <div className="relative z-10 pt-4">
                <span className="text-base sm:text-lg font-black tracking-wider text-white uppercase drop-shadow-md">
                  {card.title}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Latest bet & Race Live Bets Table */}
      <LiveBets />

      {/* Keno Originals */}
      <section className="space-y-4">
        <SectionTitle icon={Flame}>Keno Originals</SectionTitle>
        <GameGrid games={GAMES.filter((g) => g.category === "originals" && g.slug !== "baccarat")} />
      </section>

      {/* Player vs Player */}
      <section className="space-y-4">
        <SectionTitle icon={Swords}>Player vs Player Duels</SectionTitle>
        <GameGrid games={GAMES.filter((g) => g.category === "pvp")} />
      </section>

      {/* Slots */}
      <section className="space-y-4">
        <SectionTitle icon={Plane}>Aviamasters & Slots</SectionTitle>
        <GameGrid games={GAMES.filter((g) => g.category === "slots")} />
      </section>
    </div>
  );
}
