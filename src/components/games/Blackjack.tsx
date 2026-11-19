import { useState, useEffect, useRef } from "react";
import { Hand, Plus, Split, Layers, Sparkles, Trophy } from "lucide-react";
import { GameLayout, BetInput } from "./GameLayout";
import { PlayingCard } from "./PlayingCard";
import { Button } from "@/components/ui/button";
import { useSession } from "./useGame";
import { bjValue, isBlackjack, type Card } from "@/lib/games/logic";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sound";
import { Coin } from "@/components/common/bits";
import { fmt, fmtCompact } from "@/lib/format";
import { getAdvancedSettings } from "./AdvancedGameSettings";

const SHOE_DEALER = { x: 380, y: -200 };
const SHOE_PLAYER = { x: 380, y: -100 };

const label = (cards: Card[]) => {
  const { total, soft } = bjValue(cards);
  if (isBlackjack(cards)) return "Blackjack (21)";
  if (total > 21) return `Bust (${total})`;
  return soft && total <= 21 ? `${total - 10}/${total}` : String(total);
};

export default function Blackjack() {
  const [bet, setBet] = useState("100");
  const [pairsBet, setPairsBet] = useState("0");
  const [plus3Bet, setPlus3Bet] = useState("0");
  const [flash, setFlash] = useState<string | null>(null);
  const { session, busy, begin, action, active } = useSession("blackjack");
  const prevCount = useRef(0);

  const hands: { cards: Card[]; bet: number; done: boolean; doubled: boolean }[] = session?.hands ?? [];
  const dealer: Card[] = session?.dealer ?? [];
  const cur = hands[session?.active ?? 0];
  const results: string[] | undefined = session?.results;
  const sidebets = session?.sidebets;

  useEffect(() => {
    const totalCards = hands.reduce((s, h) => s + h.cards.length, 0) + dealer.length;
    if (totalCards > prevCount.current) {
      if (prevCount.current > 0) sfx.card?.();
      prevCount.current = totalCards;
    }
    if (session && session.status !== "active" && results) {
      const t = setTimeout(() => {
        const won = results.some((r) => r === "win" || r === "blackjack");
        const push = results.every((r) => r === "push");
        setFlash(results.includes("blackjack") ? "Blackjack!" : won ? "You win" : push ? "Push" : "Dealer wins");
        if (won) sfx.win(); else if (!push) sfx.lose();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [hands, dealer, session, results]);

  async function deal() {
    setFlash(null);
    prevCount.current = 0;
    const pBet = Math.max(0, Number(pairsBet) || 0);
    const sBet = Math.max(0, Number(plus3Bet) || 0);
    await begin(Number(bet), {
      sidebets: { pairs: pBet, plus3: sBet }
    });
  }
  const canDouble = cur && cur.cards.length === 2;
  const canSplit = cur && hands.length === 1 && cur.cards.length === 2 && Math.min(10, cur.cards[0].rank) === Math.min(10, cur.cards[1].rank);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const adv = getAdvancedSettings();
      if (!adv.hotkeys) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!active && !busy) deal();
      } else if (e.key === "h" || e.key === "H") {
        if (active && !busy) action("hit");
      } else if (e.key === "s" || e.key === "S") {
        if (active && !busy) action("stand");
      } else if (e.key === "d" || e.key === "D") {
        if (active && !busy && canDouble) action("double");
      }
    };

    window.addEventListener("keydown", handleDown);
    return () => {
      window.removeEventListener("keydown", handleDown);
    };
  }, [active, busy, canDouble, deal]);

  return (
    <GameLayout slug="blackjack" stageClassName="felt" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={active || busy} label="Main Bet" />

        {/* Sidebets Section */}
        <div className="space-y-2 rounded-xl bg-surface-2/60 p-2.5 border border-border/60">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1"><Sparkles className="size-3 text-gold" /> Sidebets</span>
            <span className="text-[10px] text-muted-foreground/80">Optional</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Perfect Pairs Sidebet */}
            <div className="rounded-lg bg-surface p-2 border border-border/40 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span>Perfect Pairs</span>
                <span className="text-gold font-mono text-[10px]">25:1</span>
              </div>
              <input
                type="number"
                min="0"
                step="50"
                value={pairsBet}
                onChange={(e) => setPairsBet(e.target.value)}
                disabled={active || busy}
                placeholder="0"
                className="w-full rounded bg-surface-2 px-2 py-1 text-xs font-mono font-bold text-foreground border border-border/50 focus:outline-none focus:border-primary"
              />
            </div>

            {/* 21+3 Sidebet */}
            <div className="rounded-lg bg-surface p-2 border border-border/40 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span>21 + 3</span>
                <span className="text-purple-400 font-mono text-[10px]">100:1</span>
              </div>
              <input
                type="number"
                min="0"
                step="50"
                value={plus3Bet}
                onChange={(e) => setPlus3Bet(e.target.value)}
                disabled={active || busy}
                placeholder="0"
                className="w-full rounded bg-surface-2 px-2 py-1 text-xs font-mono font-bold text-foreground border border-border/50 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="surface" size="lg" disabled={!active || busy} onClick={() => action("hit")}>Hit <Plus className="text-gold" /></Button>
          <Button variant="surface" size="lg" disabled={!active || busy} onClick={() => action("stand")}>Stand <Hand className="text-accent" /></Button>
          <Button variant="surface" size="lg" disabled={!canSplit || busy} onClick={() => action("split")}>Split <Split /></Button>
          <Button variant="surface" size="lg" disabled={!canDouble || busy} onClick={() => action("double")}>Double <span className="text-gold">×2</span></Button>
        </div>
        <Button variant="play" size="xl" className="w-full" disabled={active || busy} onClick={deal}>Deal</Button>
        <p className="text-center text-[11px] text-muted-foreground">Dealer stands on 17 · Blackjack pays 3:2</p>
      </>
    }>
      <div className="relative h-full min-h-[560px] overflow-hidden">
        {/* table rim + arcs */}
        <div className="pointer-events-none absolute inset-3 rounded-b-[45%] rounded-t-3xl border-2 border-accent/15" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <path d="M0 260 Q500 30 1000 260" fill="none" stroke="currentColor" className="text-accent/20" strokeWidth="2" />
          <path d="M0 330 Q500 110 1000 330" fill="none" stroke="currentColor" className="text-accent/15" strokeWidth="2" />
        </svg>
        {/* shoe */}
        <div className="absolute right-6 top-6 text-center">
          <div className="relative h-[100px] w-[78px]">
            <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-xl bg-felt-deep/80" />
            <PlayingCard card={null} small className="!h-[100px] !w-[72px] !animate-none" />
          </div>
          <p className="mt-1 text-[10px] font-bold tracking-[0.25em] text-muted-foreground"><Layers className="mr-1 inline size-3" />SHOE</p>
        </div>

        <div className="flex h-full flex-col items-center justify-between py-10">
          {/* dealer */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-foreground/70">
              DEALER
              {dealer.length > 0 && <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-xs tracking-normal text-foreground">{session?.dealerHidden ? `Showing ${label(dealer)}` : label(dealer)}</span>}
            </div>
            <div className="flex min-h-[140px] -space-x-12">
              {dealer.map((c, i) => <PlayingCard key={`d${i}`} card={c} delay={i === 0 ? 160 : i * 120} from={SHOE_DEALER} />)}
              {session?.dealerHidden && (
                <div className="relative">
                  <PlayingCard key="hole" card={null} delay={480} from={SHOE_DEALER} />
                </div>
              )}
            </div>
          </div>

          <div className="pointer-events-none text-center">
            <p className="text-sm font-black tracking-[0.35em] text-gold/80">BLACKJACK PAYS 3 TO 2</p>
            <p className="mt-1 text-[11px] font-bold tracking-[0.35em] text-foreground/50">DEALER STANDS ON 17</p>
            {flash && <p className={cn("mt-3 font-display text-5xl tracking-wide animate-pop-in", flash === "Dealer wins" ? "text-destructive" : flash === "Push" ? "text-foreground" : "text-success")}>{flash}</p>}
          </div>

          {/* player hands */}
          <div className="flex flex-col items-center gap-4">
            {/* Sidebet result badges */}
            {sidebets && (sidebets.pairs?.bet > 0 || sidebets.plus3?.bet > 0) && (
              <div className="flex items-center gap-3 animate-fade-up">
                {sidebets.pairs?.bet > 0 && (
                  <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border", sidebets.pairs.hit ? "bg-gold/20 border-gold text-gold" : "bg-surface-2 border-border/60 text-muted-foreground")}>
                    <span>Pairs: {sidebets.pairs.hit ? `WIN +${fmt(sidebets.pairs.bet * sidebets.pairs.payoutMult)}` : "Miss"}</span>
                  </div>
                )}
                {sidebets.plus3?.bet > 0 && (
                  <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border", sidebets.plus3.hit ? "bg-purple-500/20 border-purple-500 text-purple-300" : "bg-surface-2 border-border/60 text-muted-foreground")}>
                    <span>21+3: {sidebets.plus3.hit ? `WIN +${fmt(sidebets.plus3.bet * sidebets.plus3.payoutMult)}` : "Miss"}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-8">
              {hands.length === 0 && <div className="grid h-[180px] place-items-center text-sm text-foreground/50">Place your bet and deal</div>}
              {hands.map((h, hi) => {
                const isCur = active && session.active === hi;
                const r = results?.[hi];
                return (
                  <div key={hi} className={cn("flex flex-col items-center gap-2 rounded-2xl p-3 transition-colors", isCur && hands.length > 1 && "bg-background/20 ring-1 ring-accent/40")}>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", r === "win" || r === "blackjack" ? "bg-success text-success-foreground" : r === "bust" || r === "lose" ? "bg-destructive text-destructive-foreground" : "bg-background/70")}>{label(h.cards)}</span>
                    <div className="flex -space-x-12">
                      {h.cards.map((c, i) => <PlayingCard key={`p${hi}-${i}`} card={c} delay={hands.length === 1 && i < 2 ? i * 320 : 0} from={SHOE_PLAYER} />)}
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1 text-xs font-bold"><Coin />{fmtCompact(h.bet)}{h.doubled && " (×2)"}</span>
                    {isCur && <span className="h-0.5 w-24 rounded-full bg-success" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {session && session.status !== "active" && session.payout > 0 && (
          <div className="absolute bottom-4 left-4 rounded-lg bg-background/80 px-3 py-1.5 text-sm font-bold text-success animate-fade-up">+{fmt(session.payout)}</div>
        )}
      </div>
    </GameLayout>
  );
}
