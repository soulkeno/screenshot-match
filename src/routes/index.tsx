import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Swords, Cherry } from "lucide-react";
import { GAMES } from "@/lib/games/registry";
import { GameGrid } from "@/components/app/GameTile";
import { LiveBets } from "@/components/app/LiveBets";
import { SectionTitle, SnowCap } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
const promoVip = "/vip-club-icon.png";
const promoDaily = "/daily-rewards-icon.jpg";
const promoRake = "/rakeback-icon.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Keno — Play 20 provably fair games" },
      { name: "description", content: "Mines, Crash, Blackjack, PvP duels, slots and more. Free coins, daily rewards and rakeback." },
      { property: "og:title", content: "Keno — Play 20 provably fair games" },
      { property: "og:description", content: "Mines, Crash, Blackjack, PvP duels, slots and more on Keno." },
    ],
  }),
  component: Home,
});

const PROMOS = [
  { to: "/vip", img: promoVip, iconImg: promoVip, title: "VIP Club", text: "Double daily rewards, double rakeback & custom cosmetics" },
  { to: "/rewards", img: promoDaily, iconImg: promoDaily, title: "Daily Rewards", text: "Claim free coins every 24 hours — more as you rank up" },
  { to: "/rakeback", img: promoRake, iconImg: promoRake, title: "Rakeback", text: "Get a cut of every bet back, win or lose" },
] as const;

function Home() {
  const { profile } = useApp();
  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-4xl tracking-wide md:text-5xl">Welcome back{profile ? `, ${profile.username}` : ""}</h1>
        <p className="text-sm text-muted-foreground">Pick a game and good luck.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PROMOS.map((p) => (
          <Link key={p.to} to={p.to} className="group relative h-44 overflow-hidden rounded-2xl border border-border shadow-card">
            <SnowCap />
            <img src={p.img} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
            <div className="relative flex h-full max-w-[70%] flex-col justify-end p-5">
              <img src={p.iconImg} alt="" className="mb-2 size-7 rounded-md object-contain drop-shadow" />
              <p className="font-display text-3xl leading-none tracking-wide">{p.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.text}</p>
            </div>
          </Link>
        ))}
      </div>
      <section className="mt-8"><SectionTitle icon={Flame}>Keno Originals</SectionTitle><GameGrid games={GAMES.filter((g) => g.category === "originals")} /></section>
      <section className="mt-8"><SectionTitle icon={Swords}>Player vs Player</SectionTitle><GameGrid games={GAMES.filter((g) => g.category === "pvp")} /></section>
      <section className="mt-8"><SectionTitle icon={Cherry}>Slots</SectionTitle><GameGrid games={GAMES.filter((g) => g.category === "slots")} /></section>
      <LiveBets />
    </div>
  );
}
