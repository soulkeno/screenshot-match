import { useEffect, useRef, useState } from "react";
import { Hand, Plus, Split, Layers, Sparkles } from "lucide-react";
import { GameLayout, BetInput } from "./GameLayout";
import { useBetAmount, useSession } from "./useGame";
import { getAdvancedSettings } from "./AdvancedGameSettings";
import { PlayingCard } from "./PlayingCard";
import { Button } from "@/components/ui/button";
import { Coin } from "@/components/common/bits";
import { bjValue, type Card } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt, fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type HandT = { cards: Card[]; bet: number; done: boolean; doubled: boolean };
const SHOE_DEALER = { x: 520, y: -40 };
const SHOE_PLAYER = { x: 520, y: -300 };

function label(cards: Card[]) {
  const v = bjValue(cards);
  return v.soft && v.total < 21 ? `${v.total - 10}/${v.total}` : String(v.total);
}

export default function Blackjack() {
  const [bet, setBet] = useBetAmount("blackjack");
  const { session, busy, begin, action, active } = useSession("blackjack");
  const prevCount = useRef(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [peeking, setPeeking] = useState(false);

  const hands: HandT[] = session?.hands ?? [];
  const dealer: Card[] = session?.dealer ?? [];
  const results: string[] | undefined = session?.results;
  const cur = active ? hands[session.active] : null;

  // Sounds for each newly dealt card
  useEffect(() => {
    const count = hands.reduce((s, h) => s + h.cards.length, 0) + dealer.length;
    const diff = count - prevCount.current;
    if (diff > 0) for (let i = 0; i < Math.min(diff, 6); i++) setTimeout(sfx.card, i * 160);
    prevCount.current = count;
    if (session && session.status !== "active" && results) {
      const won = session.payout > session.wager + (session.extraWager ?? 0);
      const push = session.payout > 0 && !won;
      const t = setTimeout(() => {
        setFlash(results.includes("blackjack") ? "Blackjack!" : won ? "You win" : push ? "Push" : "Dealer wins");
        if (won) sfx.win(); else if (!push) sfx.lose();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [hands, dealer, session, results]);

  async function deal() {
    setFlash(null);
    prevCount.current = 0;
    const adv = getAdvancedSettings();
    await begin(Number(bet), { trollMode: adv.trollMode });
  }
  const canDouble = cur && cur.cards.length === 2;
  const canSplit = cur && hands.length === 1 && cur.cards.length === 2 && Math.min(10, cur.cards[0].rank) === Math.min(10, cur.cards[1].rank);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const adv = getAdvancedSettings();

      if (e.key.toLowerCase() === adv.trollKey.toLowerCase()) {
        setPeeking(true);
        return;
      }

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

    const handleUp = (e: KeyboardEvent) => {
      const adv = getAdvancedSettings();
      if (e.key.toLowerCase() === adv.trollKey.toLowerCase()) {
        setPeeking(false);
      }
    };

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, [active, busy, canDouble, deal]);

  return (
    <GameLayout slug="blackjack" stageClassName="felt" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={active || busy} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="surface" size="lg" disabled={!active || busy} onClick={() => action("hit")}>Hit <Plus className="text-gold" /></Button>
          <Button variant="surface" size="lg" disabled={!active || busy} onClick={() => action("stand")}>Stand <Hand className="text-accent" /></Button>
          <Button variant="surface" size="lg" disabled={!canSplit || busy} onClick={() => action("split")}>Split <Split /></Button>
          <Button variant="surface" size="lg" disabled={!canDouble || busy} onClick={() => action("double")}>Double <span className="text-gold">×2</span></Button>
        </div>
        <Button variant="play" size="xl" className="w-full" disabled={active || busy} onClick={deal}>Deal</Button>
        <p className="text-center text-[11px] text-muted-foreground">Dealer stands on all 17s · Blackjack pays 3:2</p>
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
                  {session?.trollDealer?.[1] && peeking && (
                    <div className="absolute inset-0 grid place-items-center rounded-xl bg-destructive/10 ring-2 ring-destructive/60 p-1 pointer-events-none z-10">
                      <div className="scale-75 opacity-80">
                        <PlayingCard card={session.trollDealer[1]} delay={0} />
                      </div>
                      <span className="absolute bottom-1 text-[9px] font-black uppercase text-destructive tracking-widest bg-black/80 px-1 rounded">X-RAY</span>
                    </div>
                  )}
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
        {session && session.status !== "active" && session.payout > 0 && (
          <div className="absolute bottom-4 left-4 rounded-lg bg-background/80 px-3 py-1.5 text-sm font-bold text-success animate-fade-up">+{fmt(session.payout)}</div>
        )}
      </div>
    </GameLayout>
  );
}
