import { useState } from "react";
import { GameLayout, BetInput, StatBox } from "./GameLayout";
import { useBetAmount, useInstant } from "./useGame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upgraderChance } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Upgrader() {
  const [bet, setBet] = useBetAmount("upgrader");
  const [mult, setMult] = useState("2");
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [res, setRes] = useState<boolean | null>(null);
  const { play, busy } = useInstant("upgrader");
  const m = Math.min(1000, Math.max(1.01, Number(mult) || 1.01));
  const chance = upgraderChance(m);
  const R = 120;
  const C = 2 * Math.PI * R;

  async function go() {
    const r = await play(Number(bet), { multiplier: m });
    if (!r) return;
    setRes(null);
    const target = r.result.roll * 360;
    const next = Math.ceil(angle / 360) * 360 + 360 * 4 + target;
    setSpinning(true);
    setAngle(next);
    sfx.roll();
    setTimeout(() => { setSpinning(false); setRes(r.result.win); if (r.result.win) sfx.bigWin(); else sfx.lose(); r.done(); }, 3100);
  }

  return (
    <GameLayout slug="upgrader" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={busy} />
        <div>
          <p className="mb-1.5 text-xs font-semibold">Target multiplier</p>
          <Input type="number" min={1.01} step="0.01" value={mult} disabled={busy} onChange={(e) => setMult(e.target.value)} className="h-11 bg-background font-bold" />
          <div className="mt-2 grid grid-cols-5 gap-1">
            {[1.5, 2, 5, 10, 50].map((v) => <button key={v} disabled={busy} onClick={() => setMult(String(v))} className="rounded-md border border-border bg-background py-1 text-xs font-bold text-muted-foreground hover:text-foreground">{v}×</button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Chance" value={`${(chance * 100).toFixed(2)}%`} />
          <StatBox label="Win" value={fmt(Number(bet) * m)} />
        </div>
        <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={go}>Upgrade</Button>
      </>
    }>
      <div className="grid h-full place-items-center p-6">
        <div className="relative size-[300px] md:size-[340px]">
          <svg viewBox="0 0 300 300" className="h-full w-full -rotate-90">
            <circle cx="150" cy="150" r={R} fill="none" stroke="var(--color-surface-2)" strokeWidth="26" />
            <circle cx="150" cy="150" r={R} fill="none" stroke="var(--color-success)" strokeWidth="26" strokeDasharray={`${C * chance} ${C}`} className="transition-all duration-300" />
          </svg>
          <div className="absolute inset-0" style={{ transform: `rotate(${angle}deg)`, transition: spinning ? "transform 3s cubic-bezier(0.15, 0.8, 0.2, 1)" : "none" }}>
            <div className="absolute left-1/2 top-[14px] h-10 w-2 -translate-x-1/2 rounded-full bg-foreground shadow-glow" />
          </div>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className={cn("font-display text-6xl tracking-wide", res === true && "text-success animate-pop-in", res === false && "text-destructive animate-pop-in")}>{m.toFixed(2)}×</p>
              <p className="text-sm text-muted-foreground">{res === null ? `${(chance * 100).toFixed(2)}% chance` : res ? "Upgraded!" : "Better luck next time"}</p>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
