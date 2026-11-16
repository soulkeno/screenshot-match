import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { GameLayout, BetInput, StatBox } from "./GameLayout";
import { useBetAmount, useInstant } from "./useGame";
import { Button } from "@/components/ui/button";
import { diceChance, diceMultiplier } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Dice() {
  const [bet, setBet] = useBetAmount("dice");
  const [target, setTarget] = useState(50);
  const [over, setOver] = useState(true);
  const [roll, setRoll] = useState<number | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const [history, setHistory] = useState<{ v: number; w: boolean }[]>([]);
  const { play, busy } = useInstant("dice");
  const mult = diceMultiplier(target, over);
  const chance = diceChance(target, over);
  const lastTick = useRef(0);

  async function go() {
    const r = await play(Number(bet), { target, over });
    if (!r) return;
    sfx.roll();
    setWin(null);
    setRoll(r.result.roll);
    setTimeout(() => {
      setWin(r.result.win);
      setHistory((h) => [{ v: r.result.roll, w: r.result.win }, ...h].slice(0, 10));
      if (r.result.win) sfx.win(); else sfx.lose();
      r.done();
    }, 450);
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === "Space" && !busy && document.activeElement?.tagName !== "INPUT") { e.preventDefault(); void go(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const setT = (v: number) => {
    const t = Math.min(98, Math.max(2, Math.round(v * 100) / 100));
    if (Math.abs(t - lastTick.current) >= 1) { sfx.tick(); lastTick.current = t; }
    setTarget(t);
  };

  return (
    <GameLayout slug="dice" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={busy} />
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Multiplier" value={`${mult.toFixed(4)}×`} />
          <StatBox label="Win chance" value={`${chance.toFixed(2)}%`} />
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          Profit on win <span className="float-right font-bold text-foreground">{fmt(Number(bet) * mult - Number(bet))}</span>
        </div>
        <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={go}>Roll dice</Button>
        <p className="text-center text-[11px] text-muted-foreground">Press space to roll</p>
      </>
    }>
      <div className="flex h-full flex-col justify-center gap-10 p-6 md:p-12">
        <div className="flex justify-end gap-1.5">
          {history.map((h, i) => (
            <span key={i} className={cn("rounded-md px-2 py-1 text-xs font-bold tabular animate-pop-in", h.w ? "bg-success text-success-foreground" : "bg-surface-2 text-muted-foreground")}>{h.v.toFixed(2)}</span>
          ))}
        </div>
        <div className="relative px-2">
          <div className="relative h-24">
            {roll !== null && (
              <div className="absolute bottom-6 -translate-x-1/2 transition-[left] duration-500 ease-out" style={{ left: `${roll}%` }}>
                <div className={cn("relative grid h-14 w-16 place-items-center rounded-xl text-lg font-black tabular shadow-card transition-colors",
                  win === null ? "bg-surface-2 text-foreground" : win ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>
                  {roll.toFixed(2)}
                  <span className={cn("absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45", win === null ? "bg-surface-2" : win ? "bg-success" : "bg-destructive")} />
                </div>
              </div>
            )}
          </div>
          <div className="rounded-full border border-border bg-background p-3 shadow-card">
            <div className="relative h-3 rounded-full">
              <div className="absolute inset-y-0 left-0 rounded-l-full" style={{ width: `${target}%`, background: over ? "var(--destructive)" : "var(--success)" }} />
              <div className="absolute inset-y-0 right-0 rounded-r-full" style={{ width: `${100 - target}%`, background: over ? "var(--success)" : "var(--destructive)" }} />
              <input type="range" min={2} max={98} step={0.01} value={target} disabled={busy} onChange={(e) => setT(Number(e.target.value))}
                className="absolute inset-0 h-3 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:size-8 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-lg [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-glow [&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-lg [&::-moz-range-thumb]:bg-primary" />
            </div>
          </div>
          <div className="mt-2 flex justify-between px-1 text-xs font-semibold text-muted-foreground">{[0, 25, 50, 75, 100].map((x) => <span key={x}>{x}</span>)}</div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Multiplier</p>
            <input type="number" step="0.01" value={mult.toFixed(4)} disabled={busy} onChange={(e) => { const m = Number(e.target.value); if (m >= 1.0102) { const c = 99 / m; setT(over ? 100 - c : c); } }} className="w-full bg-transparent text-lg font-bold tabular outline-none" />
          </div>
          <button disabled={busy} onClick={() => { setOver(!over); setTarget(Math.round((100 - target) * 100) / 100); sfx.click(); }} className="rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Roll {over ? "over" : "under"} <ArrowLeftRight className="size-3" /></p>
            <p className="text-lg font-bold tabular">{target.toFixed(2)}</p>
          </button>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Win chance</p>
            <input type="number" step="0.01" value={chance.toFixed(2)} disabled={busy} onChange={(e) => { const c = Number(e.target.value); if (c >= 2 && c <= 98) setT(over ? 100 - c : c); }} className="w-full bg-transparent text-lg font-bold tabular outline-none" />
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
