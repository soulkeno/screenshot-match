import { createFileRoute, notFound } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { GAME_BY_SLUG } from "@/lib/games/registry";
import { LiveBets } from "@/components/app/LiveBets";
import Mines from "@/components/games/Mines";
import Towers from "@/components/games/Towers";
import Dice from "@/components/games/Dice";
import Limbo from "@/components/games/Limbo";
import Coinflip from "@/components/games/Coinflip";
import Rps from "@/components/games/Rps";
import Hilo from "@/components/games/Hilo";
import Blackjack from "@/components/games/Blackjack";
import Baccarat from "@/components/games/Baccarat";
import Plinko from "@/components/games/Plinko";
import Keno from "@/components/games/Keno";
import Roulette from "@/components/games/Roulette";
import Upgrader from "@/components/games/Upgrader";
import Cases from "@/components/games/Cases";
import Slots from "@/components/games/Slots";
import Snakes from "@/components/games/Snakes";
import Crash from "@/components/games/Crash";
import PvpCoinflip from "@/components/pvp/PvpCoinflip";
import MinesDuel from "@/components/pvp/MinesDuel";
import CaseBattles from "@/components/pvp/CaseBattles";

const SCREENS: Record<string, ComponentType> = {
  mines: Mines, towers: Towers, dice: Dice, limbo: Limbo, coinflip: Coinflip, rps: Rps, hilo: Hilo, blackjack: Blackjack,
  baccarat: Baccarat, plinko: Plinko, keno: Keno, roulette: Roulette, upgrader: Upgrader, cases: Cases, slots: Slots,
  snakes: Snakes, crash: Crash, "pvp-coinflip": PvpCoinflip, "mines-duel": MinesDuel, "case-battles": CaseBattles,
};

export const Route = createFileRoute("/play/$slug")({
  loader: ({ params }) => {
    if (!GAME_BY_SLUG[params.slug]) throw notFound();
    return { slug: params.slug };
  },
  head: ({ loaderData }) => {
    const name = loaderData ? GAME_BY_SLUG[loaderData.slug]?.name : undefined;
    const title = name ? `${name} — Ember Casino` : "Game — Ember Casino";
    const desc = name ? `Play ${name} on Ember Casino. ${GAME_BY_SLUG[loaderData!.slug]?.blurb}.` : "Play on Ember Casino.";
    return { meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }] };
  },
  component: Play,
});

function Play() {
  const { slug } = Route.useParams();
  const Screen = SCREENS[slug];
  if (!Screen) return null;
  return (
    <div className="animate-fade-up">
      <Screen key={slug} />
      <LiveBets />
    </div>
  );
}
