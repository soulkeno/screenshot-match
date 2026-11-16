import { useState } from "react";
import { Shuffle, Trash2, Gem } from "lucide-react";
import { GameLayout, BetInput } from "./GameLayout";
import { useBetAmount, useInstant } from "./useGame";
import { Button } from "@/components/ui/button";
import { KENO_PAYOUTS, KENO_TILES } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export default function Keno() {
  const [bet, setBet] = useBetAmount("keno");
  const [picks, setPicks] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [hits, setHits] = useState<number | null>(null);
  const { play, busy } = useInstant("keno");

  function toggle(n: number) {
    if (busy) return;
    setDrawn([]); setHits(null);
    setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length >= 10 ? p : [...p, n]));
    sfx.click();
  }
  function auto() {
    const pool = Array.from({ length: KENO_TILES }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    setPicks(pool.slice(0, 10)); setDrawn([]); setHits(null);
  }
  async function go() {
    const r = await play(Number(bet), { picks });
    if (!r) return;
    setDrawn([]); setHits(null);
    const d: number[] = r.result.draws;
    d.forEach((n, i) => setTimeout(() => { setDrawn((x) => [...x, n]); if (picks.includes(n)) sfx.gem(); else sfx.tick(); }, (i + 1) * 140));
    setTimeout(() => { setHits(r.result.hits); if (r.payout > 0) sfx.win(); else sfx.lose(); r.done(); }, d.length * 140 + 250);
  }

  const table = picks.length ? KENO_PAYOUTS[picks.length] : [];
  return (
    <GameLayout slug="keno" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={busy} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="surface" disabled={busy} onClick={auto}><Shuffle /> Auto pick</Button>
          <Button variant="surface" disabled={busy} onClick={() => { setPicks([]); setDrawn([]); setHits(null); }}><Trash2 /> Clear</Button>
        </div>
        <p className="text-xs text-muted-foreground">{picks.length}/10 picked</p>
        <Button variant="play" size="xl" className="w-full" disabled={busy || picks.length === 0} onClick={go}>Bet</Button>
      </>
    }>
      <div className="flex h-full flex-col justify-center gap-4 p-4 md:p-8">
        <div className="mx-auto grid w-full max-w-[640px] grid-cols-8 gap-1.5 md:gap-2">
          {Array.from({ length: KENO_TILES }, (_, i) => i + 1).map((n) => {
            const picked = picks.includes(n);
            const isDrawn = drawn.includes(n);
            const hit = picked && isDrawn;
            return (
              <button key={n} onClick={() => toggle(n)}
                className={cn("relative grid aspect-square place-items-center rounded-lg text-sm font-black transition-all md:text-base",
                  hit ? "bg-success text-success-foreground animate-pop-in" : picked ? "bg-gradient-primary text-primary-foreground shadow-press" : isDrawn ? "bg-background text-destructive ring-1 ring-destructive/50 animate-pop-in" : "bg-surface-2 shadow-press hover:-translate-y-0.5 hover:bg-muted")}>
                {hit ? <Gem className="size-5" /> : n}
              </button>
            );
          })}
        </div>
        {table.length > 0 && (
          <div className="mx-auto flex w-full max-w-[640px] gap-1 overflow-x-auto no-scrollbar">
            {table.map((m, h) => (
              <div key={h} className={cn("min-w-12 flex-1 rounded-lg border px-1 py-1.5 text-center transition-colors", hits === h ? "border-success bg-success/15" : "border-border bg-surface")}>
                <p className="text-xs font-black tabular">{m}×</p>
                <p className="text-[10px] text-muted-foreground">{h} hits</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </GameLayout>
  );
}
