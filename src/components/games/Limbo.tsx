import { useRef, useState } from "react";
import { GameLayout, BetInput, StatBox } from "./GameLayout";
import { useBetAmount, useInstant } from "./useGame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Limbo() {
  const [bet, setBet] = useBetAmount("limbo");
  const [target, setTarget] = useState("2.00");
  const [shown, setShown] = useState(1);
  const [state, setState] = useState<"idle" | "rolling" | "win" | "lose">("idle");
  const [history, setHistory] = useState<{ v: number; w: boolean }[]>([]);
  const { play, busy } = useInstant("limbo");
  const raf = useRef(0);
  const t = Math.max(1.01, Number(target) || 1.01);

  async function go() {
    const r = await play(Number(bet), { target: t });
    if (!r) return;
    const end = r.result.result as number;
    setState("rolling");
    const dur = 700;
    const t0 = performance.now();
    cancelAnimationFrame(raf.current);
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(1 + (end - 1) * e);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else {
        setShown(end);
        setState(r.result.win ? "win" : "lose");
        setHistory((h) => [{ v: end, w: r.result.win }, ...h].slice(0, 10));
        if (r.result.win) sfx.win(); else sfx.lose();
        r.done();
      }
    };
    raf.current = requestAnimationFrame(step);
  }

  return (
    <GameLayout slug="limbo" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={busy} />
        <div>
          <p className="mb-1.5 text-xs font-semibold">Target multiplier</p>
          <Input type="number" step="0.01" min={1.01} value={target} disabled={busy} onChange={(e) => setTarget(e.target.value)} className="h-11 bg-background font-bold" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Win chance" value={`${(99 / t).toFixed(4)}%`} />
          <StatBox label="Profit on win" value={fmt(Number(bet) * t - Number(bet))} />
        </div>
        <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={go}>Bet</Button>
      </>
    }>
      <div className="flex h-full flex-col p-6">
        <div className="flex justify-end gap-1.5">
          {history.map((h, i) => <span key={i} className={cn("rounded-md px-2 py-1 text-xs font-bold tabular animate-pop-in", h.w ? "bg-success text-success-foreground" : "bg-surface-2 text-muted-foreground")}>{h.v.toFixed(2)}×</span>)}
        </div>
        <div className="grid flex-1 place-items-center">
          <div className="text-center">
            <p className={cn("font-display text-[clamp(5rem,14vw,10rem)] leading-none tracking-wide tabular transition-colors",
              state === "win" ? "text-success" : state === "lose" ? "text-destructive" : "text-foreground", state !== "rolling" && state !== "idle" && "animate-pop-in")}>
              {shown.toFixed(2)}×
            </p>
            <p className="mt-4 text-sm text-muted-foreground">Target <span className="font-bold text-foreground">{t.toFixed(2)}×</span></p>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
