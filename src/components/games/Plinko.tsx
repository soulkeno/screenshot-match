import { useRef, useState } from "react";
import { GameLayout, BetInput, Segmented } from "./GameLayout";
import { useBetAmount, useInstant } from "./useGame";
import { Button } from "@/components/ui/button";
import { PLINKO, type PlinkoRisk } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

type Ball = { id: number; path: number[]; start: number; bucket: number };
const ROW_MS = 110;

function bucketTone(m: number) {
  if (m >= 10) return "bg-destructive text-destructive-foreground";
  if (m >= 3) return "bg-primary text-primary-foreground";
  if (m >= 1) return "bg-gold text-primary-foreground";
  return "bg-surface-2 text-muted-foreground";
}

export default function Plinko() {
  const [bet, setBet] = useBetAmount("plinko");
  const [rows, setRows] = useState(16);
  const [risk, setRisk] = useState<PlinkoRisk>("medium");
  const [balls, setBalls] = useState<Ball[]>([]);
  const [hit, setHit] = useState<{ b: number; t: number } | null>(null);
  const [, setFrame] = useState(0);
  const raf = useRef(0);
  const ballsRef = useRef<Ball[]>([]);
  const { play, busy, setBusy } = useInstant("plinko");
  const [recent, setRecent] = useState<number[]>([]);
  const mults = PLINKO[rows][risk];

  function loop() {
    const now = performance.now();
    ballsRef.current = ballsRef.current.filter((b) => now - b.start < (b.path.length + 1) * ROW_MS + 200);
    setBalls([...ballsRef.current]);
    setFrame((f) => f + 1);
    if (ballsRef.current.length) raf.current = requestAnimationFrame(loop);
  }

  async function drop() {
    const r = await play(Number(bet), { rows, risk });
    if (!r) return;
    setBusy(false);
    const b: Ball = { id: Math.random(), path: r.result.path, start: performance.now(), bucket: r.result.bucket };
    ballsRef.current.push(b);
    sfx.click();
    r.result.path.forEach((_: number, i: number) => setTimeout(() => sfx.tick(), (i + 1) * ROW_MS));
    setTimeout(() => {
      setHit({ b: b.bucket, t: Date.now() });
      setRecent((x) => [r.result.multiplier, ...x].slice(0, 8));
      if (r.result.multiplier >= 2) sfx.win(); else sfx.coin();
      r.done();
    }, (r.result.path.length + 1) * ROW_MS);
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop);
  }

  // geometry in percentages
  const spacing = 100 / (rows + 2);
  const rowH = 88 / (rows + 1);
  const pos = (b: Ball) => {
    const t = (performance.now() - b.start) / ROW_MS;
    const k = Math.min(b.path.length, Math.floor(t));
    const frac = Math.min(1, t - k);
    const sumK = b.path.slice(0, k).reduce((a, c) => a + c, 0);
    const xK = 50 + (sumK - k / 2) * spacing;
    const next = k < b.path.length ? b.path[k] : 0;
    const xN = k < b.path.length ? 50 + (sumK + next - (k + 1) / 2) * spacing : xK;
    const x = xK + (xN - xK) * frac;
    const y = 3 + (k + frac) * rowH - Math.sin(frac * Math.PI) * rowH * 0.35;
    return { x, y };
  };

  return (
    <GameLayout slug="plinko" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={busy} />
        <Segmented label="Risk" value={risk} onChange={setRisk} disabled={balls.length > 0} options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} />
        <Segmented label="Rows" value={rows} onChange={setRows} disabled={balls.length > 0} options={[{ value: 8, label: "8" }, { value: 12, label: "12" }, { value: 16, label: "16" }]} />
        <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={drop}>Drop ball</Button>
        <div className="flex flex-wrap gap-1">{recent.map((m, i) => <span key={i} className={cn("rounded-md px-2 py-0.5 text-xs font-bold animate-pop-in", bucketTone(m))}>{m}×</span>)}</div>
      </>
    }>
      <div className="grid h-full place-items-center p-4">
        <div className="relative aspect-[1/0.9] w-full max-w-[640px]">
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: r + 3 }, (_, i) => (
              <span key={`${r}-${i}`} className="absolute size-[1.6%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/80 shadow-[0_0_6px_var(--color-foreground)]"
                style={{ left: `${50 + (i - (r + 2) / 2) * spacing}%`, top: `${3 + (r + 1) * rowH}%` }} />
            )),
          )}
          {balls.map((b) => {
            const p = pos(b);
            return <span key={b.id} className="absolute z-10 size-[2.6%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-primary shadow-glow" style={{ left: `${p.x}%`, top: `${p.y}%` }} />;
          })}
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-[0.4%]" style={{ paddingInline: `${spacing}%` }}>
            {mults.map((m, i) => (
              <div key={`${i}-${hit?.b === i ? hit.t : 0}`} className={cn("flex h-8 flex-1 items-center justify-center rounded-md text-[10px] font-black md:text-xs", bucketTone(m), hit?.b === i && "animate-pop-in ring-2 ring-foreground")}>{m}</div>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
