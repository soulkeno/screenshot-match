import type { LucideIcon } from "lucide-react";
import {
  Dice5, Rocket, Bomb, Castle, CircleDot, TrendingUp, Grid3x3, ArrowUpDown, Spade, Club, Disc3, Coins,
  ArrowBigUpDash, Worm, Scissors, Package, Cherry, Swords, Boxes, Users, Plane, Crown,
} from "lucide-react";

export type GameCategory = "originals" | "pvp" | "slots";
export type GameMeta = {
  slug: string;
  name: string;
  category: GameCategory;
  tone: string; // tone-* utility
  icon: LucideIcon;
  blurb: string;
};

export const GAMES: GameMeta[] = [
  { slug: "mines", name: "Mines", category: "originals", tone: "tone-blue", icon: Bomb, blurb: "Dodge the mines, cash out anytime" },
  { slug: "crash", name: "Crash", category: "originals", tone: "tone-red", icon: Rocket, blurb: "Cash out before the rocket blows" },
  { slug: "dice", name: "Dice", category: "originals", tone: "tone-violet", icon: Dice5, blurb: "Roll over or under your target" },
  { slug: "blackjack", name: "Blackjack", category: "originals", tone: "tone-teal", icon: Spade, blurb: "Beat the dealer to 21" },
  { slug: "plinko", name: "Plinko", category: "originals", tone: "tone-magenta", icon: CircleDot, blurb: "Drop the ball, chase the edges" },
  { slug: "towers", name: "Towers", category: "originals", tone: "tone-orange", icon: Castle, blurb: "Climb the tower one floor at a time" },
  { slug: "limbo", name: "Limbo", category: "originals", tone: "tone-pink", icon: TrendingUp, blurb: "Pick a target, hope it flies past" },
  { slug: "keno", name: "Keno", category: "originals", tone: "tone-orange", icon: Grid3x3, blurb: "Pick numbers, match the draw" },
  { slug: "hilo", name: "HiLo", category: "originals", tone: "tone-yellow", icon: ArrowUpDown, blurb: "Higher or lower, card by card" },
  { slug: "roulette", name: "Roulette", category: "originals", tone: "tone-green", icon: Disc3, blurb: "European wheel, classic bets" },
  { slug: "baccarat", name: "Baccarat", category: "originals", tone: "tone-cyan", icon: Club, blurb: "Player, Banker or Tie" },
  { slug: "coinflip", name: "Coinflip", category: "originals", tone: "tone-gold", icon: Coins, blurb: "Heads or tails, 1.98×" },
  { slug: "upgrader", name: "Upgrader", category: "originals", tone: "tone-violet", icon: ArrowBigUpDash, blurb: "Risk it for a bigger multiplier" },
  { slug: "snakes", name: "Snakes", category: "originals", tone: "tone-green", icon: Worm, blurb: "Roll the dice, avoid the snakes" },
  { slug: "rps", name: "Rock Paper Scissors", category: "originals", tone: "tone-slate", icon: Scissors, blurb: "Beat the house, 1.96×" },
  { slug: "cases", name: "Cases", category: "originals", tone: "tone-blue", icon: Package, blurb: "Unbox loot worth up to 100×" },
  { slug: "slots", name: "Aviamasters", category: "slots", tone: "tone-cyan", icon: Plane, blurb: "Aviamasters by BGaming with Keno Coins" },
  { slug: "pvp-coinflip", name: "PVP Coinflip", category: "pvp", tone: "tone-gold", icon: Swords, blurb: "Flip against another player" },
  { slug: "mines-duel", name: "Mines Duel", category: "pvp", tone: "tone-red", icon: Users, blurb: "One board, two players, one mine too many" },
  { slug: "case-battles", name: "Case Battles", category: "pvp", tone: "tone-magenta", icon: Boxes, blurb: "Open cases head to head, winner takes all" },
  { slug: "chess", name: "Chess Duel", category: "pvp", tone: "tone-violet", icon: Crown, blurb: "1v1 PvP Chess with real rules, winner takes all" },
];

export const GAME_BY_SLUG: Record<string, GameMeta> = Object.fromEntries(GAMES.map((g) => [g.slug, g]));
export const gameName = (slug: string) => GAME_BY_SLUG[slug]?.name ?? slug;
