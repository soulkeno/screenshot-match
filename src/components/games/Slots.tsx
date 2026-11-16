import { useEffect, useRef, useState } from "react";
import { Cherry, Citrus, Grape, Bell, Clover, Gem, Crown } from "lucide-react";
import { GameLayout, BetInput } from "./GameLayout";
import { useBetAmount, useInstant } from "./useGame";
import { Button } from "@/components/ui/button";
import { SLOT_LINES, SLOT_PAYS, SLOT_SCALE, SLOT_SYMBOLS, type SlotSymbol } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

const SYM: Record<SlotSymbol, { icon: React.ComponentType<{ className?: string }> | null; tone: string; label?: string }> = {
  cherry: { icon: Cherry, tone: "tone-red" },
  lemon: { icon: Citrus, tone: "tone-yellow" },
  grape: { icon: Grape, tone: "tone-violet" },
  bell: { icon: Bell, tone: "tone-gold" },
  clover: { icon: Clover, tone: "tone-green" },
  gem: { icon: Gem, tone: "tone-cyan" },
  seven: { icon: null, tone: "tone-magenta", label: "7" },
  crown: { icon: Crown, tone: "tone-orange" },
};

function Symbol({ s, glow }: { s: SlotSymbol; glow?: boolean }) {
  const d = SYM[s];
  const I = d.icon;
  return (
    <div className={cn("grid aspect-square w-full place-items-center rounded-xl border border-foreground/10 shadow-press transition", d.tone, glow && "ring-4 ring-gold scale-[1.04]")}>
      {I ? <I className="size-1/2 drop-shadow" /> : <span className="font-display text-5xl drop-shadow">{d.label}</span>}
    </div>
  );
}
const rand = () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];

export default function Slots() {
  const [bet, setBet] = useBetAmount("slots");
  const [grid, setGrid] = useState<SlotSymbol[][]>(() => Array.from({ length: 5 }, () => ["cherry", "bell", "gem"] as SlotSymbol[]));
  const [spinningReels, setSpinning] = useState<boolean[]>([false, false, false, false, false]);
  const [wins, setWins] = useState<{ line: number; count: number }[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const { play, busy } = useInstant("slots");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function spin() {
    const r = await play(Number(bet), {});
    if (!r) return;
    setWins([]); setLast(null);
    const final: SlotSymbol[][] = r.result.grid;
    const spinning = [true, true, true, true, true];
    setSpinning([...spinning]);
    timer.current = setInterval(() => {
      setGrid((g) => g.map((col, i) => (spinning[i] ? [rand(), rand(), rand()] : col)));
      sfx.tick();
    }, 70);
    final.forEach((col, i) => setTimeout(() => {
      spinning[i] = false;
      setSpinning([...spinning]);
      setGrid((g) => g.map((c, j) => (j === i ? col : c)));
      sfx.card();
      if (i === 4) {
        if (timer.current) clearInterval(timer.current);
        setWins(r.result.wins);
        setLast(r.payout);
        if (r.result.mult >= 10) sfx.bigWin(); else if (r.payout > 0) sfx.win();
        r.done();
      }
    }, 700 + i * 320));
  }

  const winCells = new Set<string>();
  wins.forEach((w) => SLOT_LINES[w.line].slice(0, w.count).forEach((row, reel) => winCells.add(`${reel}-${row}`)));

  return (
    <GameLayout slug="slots" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={busy} />
        <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={spin}>Spin</Button>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paytable (× total bet)</p>
          <div className="space-y-1">
            {[...SLOT_SYMBOLS].reverse().map((s) => (
              <div key={s} className="flex items-center gap-2 text-xs">
                <div className="w-6"><Symbol s={s} /></div>
                <span className="flex-1 text-muted-foreground">3 / 4 / 5</span>
                <span className="font-bold tabular">{SLOT_PAYS[s].map((p) => +((p * SLOT_SCALE) / 10).toFixed(2)).join(" / ")}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">10 paylines, wins pay left to right.</p>
        </div>
      </>
    }>
      <div className="flex h-full flex-col items-center justify-center gap-6 p-4 md:p-8" style={{ background: "radial-gradient(80% 60% at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent)" }}>
        <h3 className="font-display text-5xl tracking-wider text-gradient-primary">KENO SLOTS</h3>
        <div className="grid w-full max-w-[600px] grid-cols-5 gap-2 rounded-3xl border-4 border-primary/40 bg-background p-3 shadow-glow">
          {grid.map((col, reel) => (
            <div key={reel} className={cn("space-y-2", spinningReels[reel] && "blur-[1.5px]")}>
              {col.map((s, row) => <Symbol key={row} s={s} glow={winCells.has(`${reel}-${row}`)} />)}
            </div>
          ))}
        </div>
        <div className="h-10">{last !== null && <p className={cn("font-display text-4xl tracking-wide animate-pop-in", last > 0 ? "text-success" : "text-muted-foreground")}>{last > 0 ? `WIN ${fmt(last)}` : "No win"}</p>}</div>
      </div>
    </GameLayout>
  );
}
