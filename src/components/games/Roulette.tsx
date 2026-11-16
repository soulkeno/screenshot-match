import { useState } from "react";
import { Undo2, Trash2 } from "lucide-react";
import { GameLayout } from "./GameLayout";
import { useInstant } from "./useGame";
import { Button } from "@/components/ui/button";
import { ROULETTE_WHEEL, rouletteColor, type RouletteBet, type RouletteBetKind } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt, fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHIPS = [10, 100, 1000, 10000, 100000];
const keyOf = (b: { kind: RouletteBetKind; value?: number }) => `${b.kind}:${b.value ?? ""}`;
const colorCls = (n: number) => (rouletteColor(n) === "red" ? "bg-suit-red" : rouletteColor(n) === "black" ? "bg-suit-black" : "bg-success");

export default function Roulette() {
  const [chip, setChip] = useState(100);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const { play, busy } = useInstant("roulette");
  const total = bets.reduce((s, b) => s + b.amount, 0);

  function place(kind: RouletteBetKind, value?: number) {
    if (busy || spinning) return;
    sfx.coin();
    setBets((bs) => {
      const k = keyOf({ kind, value });
      const ex = bs.find((b) => keyOf(b) === k);
      if (ex) return bs.map((b) => (keyOf(b) === k ? { ...b, amount: b.amount + chip } : b));
      return [...bs, { kind, value, amount: chip }];
    });
  }
  const amountOn = (kind: RouletteBetKind, value?: number) => bets.find((b) => keyOf(b) === keyOf({ kind, value }))?.amount;

  async function spin() {
    const r = await play(total, { bets });
    if (!r) return;
    const n = r.result.number as number;
    const idx = ROULETTE_WHEEL.indexOf(n);
    const seg = 360 / 37;
    const target = 360 - idx * seg;
    const next = Math.ceil(rot / 360) * 360 + 360 * 5 + target;
    setSpinning(true); setResult(null);
    setRot(next);
    sfx.roll();
    setTimeout(() => {
      setSpinning(false); setResult(n); setHistory((h) => [n, ...h].slice(0, 14));
      if (r.payout > 0) sfx.win(); else sfx.lose();
      r.done();
    }, 4100);
  }

  const Cell = ({ kind, value, children, className }: { kind: RouletteBetKind; value?: number; children: React.ReactNode; className?: string }) => {
    const a = amountOn(kind, value);
    const won = result !== null && !spinning && kind === "straight" && value === result;
    return (
      <button onClick={() => place(kind, value)} className={cn("relative grid place-items-center rounded-md text-xs font-black text-foreground transition hover:brightness-125", won && "ring-2 ring-gold", className)}>
        {children}
        {a && <span className="absolute -right-1 -top-1 z-10 grid min-w-6 place-items-center rounded-full bg-gradient-gold px-1 py-0.5 text-[9px] font-black text-primary-foreground shadow-press animate-pop-in">{fmtCompact(a)}</span>}
      </button>
    );
  };

  return (
    <GameLayout slug="roulette" controls={
      <>
        <div>
          <p className="mb-1.5 text-xs font-semibold">Chip value</p>
          <div className="grid grid-cols-5 gap-1.5">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => setChip(c)} className={cn("grid aspect-square place-items-center rounded-full border-4 border-dashed text-[10px] font-black transition", chip === c ? "border-primary-foreground/40 bg-gradient-primary text-primary-foreground scale-110" : "border-border bg-surface-2 text-muted-foreground")}>{fmtCompact(c)}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="surface" disabled={busy || !bets.length} onClick={() => setBets((b) => b.slice(0, -1))}><Undo2 /> Undo</Button>
          <Button variant="surface" disabled={busy || !bets.length} onClick={() => setBets([])}><Trash2 /> Clear</Button>
        </div>
        <p className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">Total bet <span className="float-right font-bold text-foreground">{fmt(total)}</span></p>
        <Button variant="play" size="xl" className="w-full" disabled={busy || spinning || !bets.length} onClick={spin}>Spin</Button>
      </>
    }>
      <div className="flex h-full flex-col items-center justify-center gap-6 p-4">
        <div className="flex w-full items-center justify-between gap-6">
          <div className="relative size-56 shrink-0 md:size-64">
            <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[16px] border-x-transparent border-t-gold" />
            <div className="h-full w-full rounded-full border-8 border-felt-deep shadow-card" style={{ transform: `rotate(${rot}deg)`, transition: spinning ? "transform 4s cubic-bezier(0.12, 0.7, 0.15, 1)" : "none" }}>
              <svg viewBox="-100 -100 200 200" className="h-full w-full">
                {ROULETTE_WHEEL.map((n, i) => {
                  const a0 = ((i - 0.5) * 360) / 37 - 90;
                  const a1 = ((i + 0.5) * 360) / 37 - 90;
                  const p = (a: number, r: number) => `${r * Math.cos((a * Math.PI) / 180)} ${r * Math.sin((a * Math.PI) / 180)}`;
                  const c = rouletteColor(n);
                  return (
                    <g key={n}>
                      <path d={`M ${p(a0, 96)} A 96 96 0 0 1 ${p(a1, 96)} L ${p(a1, 60)} A 60 60 0 0 0 ${p(a0, 60)} Z`} fill={c === "red" ? "var(--suit-red)" : c === "black" ? "var(--suit-black)" : "var(--success)"} stroke="var(--felt-deep)" strokeWidth="0.8" />
                      <text x={0} y={-82} transform={`rotate(${(i * 360) / 37})`} textAnchor="middle" fontSize="8" fontWeight="800" fill="var(--playing-card)">{n}</text>
                    </g>
                  );
                })}
                <circle r="58" fill="var(--felt)" />
                <circle r="20" fill="var(--gold)" opacity="0.8" />
              </svg>
            </div>
            {result !== null && !spinning && <div className={cn("absolute inset-0 m-auto grid size-16 place-items-center rounded-full text-2xl font-black animate-pop-in", colorCls(result))}>{result}</div>}
          </div>
          <div className="hidden flex-1 flex-wrap justify-end gap-1 md:flex">
            {history.map((n, i) => <span key={i} className={cn("grid size-8 place-items-center rounded-md text-xs font-black animate-pop-in", colorCls(n))}>{n}</span>)}
          </div>
        </div>

        <div className="w-full max-w-3xl overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-[44px_repeat(12,1fr)_44px] gap-1">
            <Cell kind="straight" value={0} className="row-span-3 bg-success">0</Cell>
            {[3, 2, 1].map((row) => (
              <div key={row} className="contents">
                {Array.from({ length: 12 }, (_, c) => c * 3 + row).map((n) => <Cell key={n} kind="straight" value={n} className={cn("h-11", colorCls(n))}>{n}</Cell>)}
                <Cell kind="column" value={row} className="h-11 bg-surface-2">2:1</Cell>
              </div>
            ))}
            <div />
            {[1, 2, 3].map((d) => <Cell key={d} kind="dozen" value={d} className="col-span-4 h-10 bg-surface-2">{d === 1 ? "1 to 12" : d === 2 ? "13 to 24" : "25 to 36"}</Cell>)}
            <div />
            <div />
            <Cell kind="low" className="col-span-2 h-10 bg-surface-2">1-18</Cell>
            <Cell kind="even" className="col-span-2 h-10 bg-surface-2">Even</Cell>
            <Cell kind="red" className="col-span-2 h-10 bg-suit-red">Red</Cell>
            <Cell kind="black" className="col-span-2 h-10 bg-suit-black">Black</Cell>
            <Cell kind="odd" className="col-span-2 h-10 bg-surface-2">Odd</Cell>
            <Cell kind="high" className="col-span-2 h-10 bg-surface-2">19-36</Cell>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
