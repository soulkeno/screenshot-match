import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Flame, Swords, Plane, ChevronLeft, ChevronRight, Sparkles, Rocket,
  Disc3, Spade, ShieldCheck, Trophy, Layers, Filter, Check, Crown
} from "lucide-react";
import { GAMES, type GameMeta } from "@/lib/games/registry";
import { GameGrid } from "@/components/app/GameTile";
import { LiveBets } from "@/components/app/LiveBets";
import { UserAvatar, Coin } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/integrations/supabase/client";
import { fmt, fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EMBER Casino — Provably Fair Gaming" },
      { name: "description", content: "Play Mines, Crash, Blackjack, PvP Chess, Slots and more on EMBER." },
      { property: "og:title", content: "EMBER Casino" },
      { property: "og:description", content: "Play Mines, Crash, Blackjack, PvP Chess, Slots and more on EMBER." },
    ],
  }),
  component: Home,
});

type WinnerItem = {
  id: string;
  game: string;
  username: string;
  payout: number;
  avatar_url?: string | null;
  hot?: boolean;
};

const INITIAL_WINNERS: WinnerItem[] = [
  { id: "w1", game: "crash", username: "Martin", payout: 2150, hot: false },
  { id: "w2", game: "mines", username: "Bobbi", payout: 1770, hot: true },
  { id: "w3", game: "slots", username: "Korben", payout: 4100, hot: false },
  { id: "w4", game: "blackjack", username: "Kvoper", payout: 3120, hot: false },
  { id: "w5", game: "chess", username: "Alexey", payout: 10100, hot: true },
  { id: "w6", game: "roulette", username: "Niko", payout: 5400, hot: false },
  { id: "w7", game: "towers", username: "Viper", payout: 2980, hot: false },
];

export function Home() {
  const { profile } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "originals" | "slots" | "pvp" | "table" | "hot">("all");
  const [winners, setWinners] = useState<WinnerItem[]>(INITIAL_WINNERS);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Fetch recent big bets from Supabase for live ticker
  useEffect(() => {
    supabase
      .from("bets")
      .select("id, game, username, payout, multiplier")
      .gte("payout", 50)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const list: WinnerItem[] = data.map((b, idx) => ({
            id: b.id,
            game: b.game,
            username: b.username || "Player",
            payout: Number(b.payout),
            hot: Number(b.multiplier) >= 5 || idx % 3 === 0,
          }));
          setWinners(list);
        }
      });

    const ch = supabase
      .channel("ticker-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bets" }, (pl) => {
        const b = pl.new as any;
        if (Number(b.payout) > Number(b.wager)) {
          setWinners((prev) => [
            {
              id: b.id,
              game: b.game,
              username: b.username || "Player",
              payout: Number(b.payout),
              hot: Number(b.multiplier) >= 5,
            },
            ...prev.slice(0, 15),
          ]);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  // Filter games according to active category
  const filteredGames = GAMES.filter((g) => {
    if (activeTab === "all") return true;
    if (activeTab === "originals") return g.category === "originals" && g.slug !== "baccarat";
    if (activeTab === "slots") return g.category === "slots";
    if (activeTab === "pvp") return g.category === "pvp";
    if (activeTab === "table") {
      return ["blackjack", "roulette", "baccarat", "hilo"].includes(g.slug);
    }
    if (activeTab === "hot") {
      return ["crash", "mines", "slots", "chess", "plinko", "blackjack"].includes(g.slug);
    }
    return true;
  });

  const nextSlide = () => setCarouselIndex((i) => (i + 1) % 3);
  const prevSlide = () => setCarouselIndex((i) => (i - 1 + 3) % 3);

  return (
    <div className="space-y-6 animate-fade-up select-none pb-12">
      {/* 3. Top Hero Section: 3-column promo carousel with circular left/right navigation arrows */}
      <div className="relative">
        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute -left-3 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[#1a1d24]/90 text-white shadow-xl backdrop-blur transition hover:scale-110 hover:bg-[#222630] cursor-pointer"
          aria-label="Previous promo"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute -right-3 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[#1a1d24]/90 text-white shadow-xl backdrop-blur transition hover:scale-110 hover:bg-[#222630] cursor-pointer"
          aria-label="Next promo"
        >
          <ChevronRight className="size-5" />
        </button>

        {/* 3-Column Promo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Welcome Bonus */}
          <div className="group relative flex h-60 flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#1a1333] via-[#1a1d24] to-[#121318] p-5 shadow-card transition-all hover:border-[#00d293]/30">
            {/* Visual background art */}
            <div className="absolute -right-4 -top-6 size-44 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
            <img
              src="/games/crash.jpg"
              alt=""
              className="absolute right-0 top-0 h-full w-2/5 object-cover opacity-25 mix-blend-screen transition-transform duration-500 group-hover:scale-110 pointer-events-none"
            />

            <div>
              <span className="inline-block rounded-full bg-[#00d293]/15 border border-[#00d293]/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00d293]">
                Special Offer
              </span>
              <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                Welcome Bonus
              </h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 max-w-[220px]">
                Top up your balance with $100 and get 50 free spins right now!
              </p>
            </div>

            <div className="flex items-center gap-2 pt-4 relative z-10">
              <Link
                to="/vault"
                className="rounded-full bg-[#00d293] hover:bg-[#00d293]/90 text-[#05261b] px-4 py-2 text-xs font-black shadow-md transition hover:scale-105"
              >
                Claim Bonus
              </Link>
              <Link
                to="/rewards"
                className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3.5 py-2 text-xs font-semibold transition"
              >
                Details
              </Link>
            </div>
          </div>

          {/* Card 2: VIP Program */}
          <div className="group relative flex h-60 flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f2424] via-[#1a1d24] to-[#121318] p-5 shadow-card transition-all hover:border-[#00d293]/30">
            <div className="absolute -right-4 -top-6 size-44 rounded-full bg-[#00d293]/20 blur-3xl pointer-events-none" />
            <img
              src="/vip-club-icon.png"
              alt=""
              className="absolute right-2 top-2 size-36 object-contain opacity-35 transition-transform duration-500 group-hover:scale-110 pointer-events-none"
            />

            <div>
              <span className="inline-block rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
                Exclusive Perks
              </span>
              <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                VIP Program
              </h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 max-w-[220px]">
                Get daily rakeback, level-up perks, and unlock VIP club rewards.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-4 relative z-10">
              <Link
                to="/clubs"
                className="rounded-full bg-[#00d293] hover:bg-[#00d293]/90 text-[#05261b] px-4 py-2 text-xs font-black shadow-md transition hover:scale-105"
              >
                Join VIP
              </Link>
              <Link
                to="/rakeback"
                className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3.5 py-2 text-xs font-semibold transition"
              >
                Terms of Use
              </Link>
            </div>
          </div>

          {/* Card 3: Daily Race / Tournaments */}
          <div className="group relative flex h-60 flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#2a131b] via-[#1a1d24] to-[#121318] p-5 shadow-card transition-all hover:border-[#00d293]/30">
            <div className="absolute -right-4 -top-6 size-44 rounded-full bg-rose-600/20 blur-3xl pointer-events-none" />
            <img
              src="/games/cases.jpg"
              alt=""
              className="absolute right-0 top-0 h-full w-2/5 object-cover opacity-25 mix-blend-screen transition-transform duration-500 group-hover:scale-110 pointer-events-none"
            />

            <div>
              <span className="inline-block rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-400">
                Prize Pool Active
              </span>
              <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                Daily Race
              </h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 max-w-[220px]">
                Compete against players, climb the daily leaderboard and win massive coin prizes.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-4 relative z-10">
              <Link
                to="/leaderboard"
                className="rounded-full bg-[#00d293] hover:bg-[#00d293]/90 text-[#05261b] px-4 py-2 text-xs font-black shadow-md transition hover:scale-105"
              >
                View Leaderboard
              </Link>
              <Link
                to="/leaderboard"
                className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3.5 py-2 text-xs font-semibold transition"
              >
                Terms of Use
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Winner/Live Ticker: Compact horizontal scrolling row */}
      <div className="relative overflow-hidden py-1">
        <div
          ref={tickerRef}
          className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {winners.map((w) => {
            const gameMeta = GAMES.find((g) => g.slug === w.game);
            return (
              <div
                key={w.id}
                onClick={() => navigate({ to: "/play/$slug", params: { slug: w.game } })}
                className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1c202a] to-[#141720] shadow-[0_6px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] px-3.5 py-2.5 shrink-0 hover:border-[#00d293]/40 hover:scale-[1.02] transition cursor-pointer select-none"
              >
                {/* Hot Badge */}
                {w.hot && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-black text-white uppercase shadow-sm">
                    HOT
                  </span>
                )}

                {/* Game Thumbnail */}
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#121318] border border-white/5 overflow-hidden shrink-0 shadow-inner">
                  {gameMeta ? (
                    <gameMeta.icon className="size-4 text-[#00d293]" />
                  ) : (
                    <Sparkles className="size-4 text-[#00d293]" />
                  )}
                </div>

                {/* Middle Info */}
                <div className="min-w-0 pr-1">
                  <p className="text-xs font-bold text-white truncate max-w-[110px]">
                    {gameMeta?.name ?? w.game}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                    <UserAvatar name={w.username} size={15} />
                    <span className="truncate max-w-[70px]">{w.username}</span>
                  </div>
                </div>

                {/* Right Win Amount in Emerald Green */}
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#00d293] shrink-0 bg-[#00d293]/15 border border-[#00d293]/30 px-2.5 py-1 rounded-full shadow-sm">
                  <Coin className="size-3.5" />
                  <span>{fmtCompact(w.payout)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Category Filter Bar: Unified dark pill navigation bar */}
      <div className="flex items-center justify-between gap-3 rounded-full border border-white/5 bg-[#1a1d24] p-1.5 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Active / Inactive tabs */}
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all shrink-0",
              activeTab === "all"
                ? "bg-[#00d293] text-[#05261b] shadow-md shadow-[#00d293]/20"
                : "text-muted-foreground hover:bg-[#222630] hover:text-white"
            )}
          >
            <Layers className="size-3.5" />
            <span>All Games</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px] font-black",
                activeTab === "all" ? "bg-[#05261b]/20 text-[#05261b]" : "bg-white/10 text-muted-foreground"
              )}
            >
              {GAMES.length}+
            </span>
          </button>

          <button
            onClick={() => setActiveTab("originals")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all shrink-0",
              activeTab === "originals"
                ? "bg-[#00d293] text-[#05261b] shadow-md"
                : "text-muted-foreground hover:bg-[#222630] hover:text-white"
            )}
          >
            <Sparkles className="size-3.5 text-amber-400" />
            <span>Originals</span>
          </button>

          <button
            onClick={() => setActiveTab("slots")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all shrink-0",
              activeTab === "slots"
                ? "bg-[#00d293] text-[#05261b] shadow-md"
                : "text-muted-foreground hover:bg-[#222630] hover:text-white"
            )}
          >
            <Plane className="size-3.5 text-cyan-400" />
            <span>Slots</span>
          </button>

          <button
            onClick={() => setActiveTab("pvp")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all shrink-0",
              activeTab === "pvp"
                ? "bg-[#00d293] text-[#05261b] shadow-md"
                : "text-muted-foreground hover:bg-[#222630] hover:text-white"
            )}
          >
            <Swords className="size-3.5 text-rose-400" />
            <span>PvP Duels</span>
          </button>

          <button
            onClick={() => setActiveTab("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all shrink-0",
              activeTab === "table"
                ? "bg-[#00d293] text-[#05261b] shadow-md"
                : "text-muted-foreground hover:bg-[#222630] hover:text-white"
            )}
          >
            <Spade className="size-3.5 text-indigo-400" />
            <span>Table Games</span>
          </button>

          <button
            onClick={() => setActiveTab("hot")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all shrink-0",
              activeTab === "hot"
                ? "bg-[#00d293] text-[#05261b] shadow-md"
                : "text-muted-foreground hover:bg-[#222630] hover:text-white"
            )}
          >
            <Flame className="size-3.5 text-orange-400" />
            <span>Hottest</span>
          </button>
        </div>

        {/* Right side: Provider dropdown pill */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/5 bg-[#121318] px-3.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-white hover:border-white/10 transition cursor-pointer shrink-0">
          <Filter className="size-3 text-[#00d293]" />
          <span>Select provider</span>
          <ChevronRight className="size-3 text-muted-foreground" />
        </div>
      </div>

      {/* 5. Game Grid Section Header: "🔥 Hottest Games" with next/prev arrows */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg sm:text-xl font-black tracking-tight text-white">
            <span className="text-orange-400">🔥</span>
            <span>
              {activeTab === "all"
                ? "Hottest Games"
                : activeTab === "originals"
                ? "Keno Originals"
                : activeTab === "slots"
                ? "Featured Slots"
                : activeTab === "pvp"
                ? "PvP Duels"
                : activeTab === "table"
                ? "Table & Live Games"
                : "Hottest Games"}
            </span>
          </h2>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const tabs: Array<typeof activeTab> = ["all", "originals", "slots", "pvp", "table", "hot"];
                const idx = tabs.indexOf(activeTab);
                setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length]);
              }}
              className="grid size-8 place-items-center rounded-full border border-white/5 bg-[#1a1d24] text-muted-foreground hover:bg-[#222630] hover:text-white transition cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => {
                const tabs: Array<typeof activeTab> = ["all", "originals", "slots", "pvp", "table", "hot"];
                const idx = tabs.indexOf(activeTab);
                setActiveTab(tabs[(idx + 1) % tabs.length]);
              }}
              className="grid size-8 place-items-center rounded-full border border-white/5 bg-[#1a1d24] text-muted-foreground hover:bg-[#222630] hover:text-white transition cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Game Grid with 3:4 portrait ratio cards */}
        <GameGrid games={filteredGames} />
      </section>

      {/* Live Bets Section */}
      <LiveBets />
    </div>
  );
}
